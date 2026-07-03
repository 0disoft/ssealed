import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeText, sha256 } from "./checksum.js";
import { assertNoSymlinkInPath, ensureDirectoryInsideTarget, resolveInsideTarget } from "./path-safety.js";
import type { PlannedFile, TemplateFile } from "./types.js";
import { validationScripts } from "../templates/runners.js";

const gitignoreStart = "# >>> ssealed ignore patterns >>>";
const gitignoreEnd = "# <<< ssealed ignore patterns <<<";

export async function planTemplateFile(params: {
  readonly targetRoot: string;
  readonly template: TemplateFile;
  readonly force: boolean;
  readonly previousChecksum: string | undefined;
}): Promise<PlannedFile> {
  const targetPath = resolveInsideTarget(params.targetRoot, params.template.path);
  const existingContent = await readExistingText(targetPath);
  const generatedContent = normalizeText(params.template.content);
  const previouslyGenerated =
    existingContent !== undefined && params.previousChecksum !== undefined
      ? params.previousChecksum === checksumExisting(existingContent)
      : undefined;

  if (params.template.merge === "gitignore") {
    return planGitignore(params.template, existingContent, generatedContent, params.force, previouslyGenerated);
  }

  if (params.template.merge === "package-json") {
    return planPackageJson(params.template, existingContent, params.force, previouslyGenerated);
  }

  if (params.template.merge === "manifest") {
    return planManifest(params.template, existingContent, generatedContent, params.force, previouslyGenerated);
  }

  if (existingContent === undefined) {
    return { ...params.template, action: "create", content: generatedContent };
  }

  if (normalizeText(existingContent) === generatedContent) {
    return { ...params.template, action: "unchanged", content: generatedContent, existingContent, previouslyGenerated };
  }

  if (params.force) {
    return { ...params.template, action: "overwrite", content: generatedContent, existingContent, previouslyGenerated };
  }

  return {
    ...params.template,
    action: "conflict",
    content: generatedContent,
    existingContent,
    previouslyGenerated,
    reason: "Existing file differs from generated scaffold content.",
  };
}

export async function writePlannedFiles(targetRoot: string, files: readonly PlannedFile[]): Promise<readonly string[]> {
  const written: string[] = [];
  await ensureDirectoryInsideTarget(targetRoot, targetRoot);
  const writableFiles = files.filter((file) => file.action !== "unchanged" && file.action !== "conflict");

  for (const file of writableFiles) {
    const targetPath = resolveInsideTarget(targetRoot, file.path);
    await assertNoSymlinkInPath(targetRoot, targetPath);
  }

  try {
    for (const file of writableFiles) {
      const targetPath = resolveInsideTarget(targetRoot, file.path);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeTextFileAtomically(targetPath, normalizeText(file.content));
      written.push(file.path);
    }
  } catch (error) {
    await rollbackWrittenFiles(targetRoot, writableFiles, written);
    throw error;
  }

  return written;
}

async function readExistingText(filePath: string): Promise<string | undefined> {
  const stat = await lstat(filePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });

  if (stat === undefined) {
    return undefined;
  }
  if (stat.isSymbolicLink()) {
    return "";
  }
  if (!stat.isFile()) {
    return "";
  }
  return readFile(filePath, "utf8");
}

function planGitignore(
  template: TemplateFile,
  existingContent: string | undefined,
  generatedBlock: string,
  force: boolean,
  previouslyGenerated: boolean | undefined,
): PlannedFile {
  if (existingContent === undefined) {
    return { ...template, action: "create", content: generatedBlock };
  }

  const blockRange = findManagedBlock(existingContent);
  if (blockRange !== undefined) {
    const currentBlock = normalizeText(existingContent.slice(blockRange.start, blockRange.end));
    if (currentBlock === generatedBlock) {
      return { ...template, action: "unchanged", content: normalizeText(existingContent), existingContent, previouslyGenerated };
    }
    if (!force) {
      return {
        ...template,
        action: "conflict",
        content: generatedBlock,
        existingContent,
        previouslyGenerated,
        reason: "Existing .gitignore has a different ssealed managed block.",
      };
    }
    const next = `${existingContent.slice(0, blockRange.start)}${generatedBlock.trimEnd()}${existingContent.slice(blockRange.end)}`;
    return { ...template, action: "merge", content: normalizeText(next), existingContent, previouslyGenerated };
  }

  if (!hasMissingGitignorePattern(existingContent, generatedBlock)) {
    return { ...template, action: "unchanged", content: normalizeText(existingContent), existingContent, previouslyGenerated };
  }
  const separator = existingContent.endsWith("\n") ? "\n" : "\n\n";
  return { ...template, action: "merge", content: normalizeText(`${existingContent}${separator}${generatedBlock}`), existingContent, previouslyGenerated };
}

function planPackageJson(
  template: TemplateFile,
  existingContent: string | undefined,
  force: boolean,
  previouslyGenerated: boolean | undefined,
): PlannedFile {
  const runner = template.runner === "pnpm" ? "pnpm" : "npm";
  const scripts = validationScripts(runner);

  if (existingContent === undefined) {
    return {
      ...template,
      action: "create",
      content: normalizeText(JSON.stringify({ scripts }, null, 2)),
    };
  }

  const parsed = parseJsonObject(existingContent);
  if (parsed === undefined) {
    return {
      ...template,
      action: "conflict",
      content: template.content,
      existingContent,
      previouslyGenerated,
      reason: "Existing package.json is not valid JSON.",
    };
  }

  const currentScripts = isRecord(parsed.scripts) ? parsed.scripts : {};
  const nextScripts = { ...currentScripts };
  const userOwnedScripts = force
    ? Object.entries(scripts)
        .filter(([name]) => name in nextScripts && !isGeneratedValidationScript(nextScripts[name]))
        .map(([name]) => name)
    : [];
  if (userOwnedScripts.length > 0) {
    return {
      ...template,
      action: "conflict",
      content: template.content,
      existingContent,
      previouslyGenerated,
      reason: `Existing package.json has user-owned validation scripts: ${userOwnedScripts.join(", ")}.`,
    };
  }
  for (const [name, value] of Object.entries(scripts)) {
    if (force || !(name in nextScripts)) {
      nextScripts[name] = value;
    }
  }
  const nextPackage = { ...parsed, scripts: nextScripts };
  const indent = detectJsonIndent(existingContent);
  const nextContent = normalizeText(JSON.stringify(nextPackage, null, indent));
  if (normalizeText(existingContent) === nextContent) {
    return { ...template, action: "unchanged", content: nextContent, existingContent, previouslyGenerated };
  }
  return { ...template, action: "merge", content: nextContent, existingContent, previouslyGenerated };
}

function planManifest(
  template: TemplateFile,
  existingContent: string | undefined,
  generatedContent: string,
  force: boolean,
  previouslyGenerated: boolean | undefined,
): PlannedFile {
  if (existingContent === undefined) {
    return { ...template, action: "create", content: generatedContent };
  }

  if (normalizeText(existingContent) === generatedContent) {
    return { ...template, action: "unchanged", content: generatedContent, existingContent, previouslyGenerated };
  }

  if (sameManifestExceptGeneratedAt(existingContent, generatedContent)) {
    return { ...template, action: "unchanged", content: normalizeText(existingContent), existingContent, previouslyGenerated };
  }

  if (force) {
    return { ...template, action: "overwrite", content: generatedContent, existingContent, previouslyGenerated };
  }

  return {
    ...template,
    action: "conflict",
    content: generatedContent,
    existingContent,
    previouslyGenerated,
    reason: "Existing manifest does not match the current scaffold plan.",
  };
}

function checksumExisting(content: string): string {
  return sha256(content);
}

function findManagedBlock(content: string): { readonly start: number; readonly end: number } | undefined {
  const start = content.indexOf(gitignoreStart);
  if (start < 0) {
    return undefined;
  }
  const endMarker = content.indexOf(gitignoreEnd, start);
  if (endMarker < 0) {
    return undefined;
  }
  return { start, end: endMarker + gitignoreEnd.length };
}

function hasMissingGitignorePattern(existingContent: string, generatedBlock: string): boolean {
  const existingLines = new Set(
    existingContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
  const missing = generatedBlock
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed === gitignoreStart || trimmed === gitignoreEnd || trimmed.length === 0 || !existingLines.has(trimmed);
    })
    .join("\n");
  return normalizeText(missing).trim() !== `${gitignoreStart}\n${gitignoreEnd}`;
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function detectJsonIndent(content: string): number {
  const match = /\n( +)"/u.exec(content);
  return match?.[1]?.length ?? 2;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function sameManifestExceptGeneratedAt(existingContent: string, generatedContent: string): boolean {
  const existing = parseJsonObject(existingContent);
  const generated = parseJsonObject(generatedContent);
  if (existing === undefined || generated === undefined) {
    return false;
  }

  const existingComparable = { ...existing, generatedAt: generated.generatedAt };
  return JSON.stringify(existingComparable) === JSON.stringify(generated);
}

async function rollbackWrittenFiles(
  targetRoot: string,
  files: readonly PlannedFile[],
  writtenPaths: readonly string[],
): Promise<void> {
  for (const relativePath of [...writtenPaths].reverse()) {
    const file = files.find((candidate) => candidate.path === relativePath);
    if (file === undefined) {
      continue;
    }
    const targetPath = resolveInsideTarget(targetRoot, relativePath);
    if (file.existingContent === undefined) {
      await rm(targetPath, { force: true }).catch(() => undefined);
    } else {
      await writeTextFileAtomically(targetPath, file.existingContent).catch(() => undefined);
    }
  }
}

function isGeneratedValidationScript(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const generatedScripts = new Set([...Object.values(validationScripts("npm")), ...Object.values(validationScripts("pnpm"))]);
  return generatedScripts.has(value);
}

async function writeTextFileAtomically(targetPath: string, content: string): Promise<void> {
  const temporaryPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
