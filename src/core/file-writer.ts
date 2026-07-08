import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeText, sha256 } from "./checksum.js";
import { assertNoSymlinkInPath, ensureDirectoryInsideTarget, resolveInsideTarget } from "./path-safety.js";
import type { FileOwnership, FilePresence, ManifestFileStatus, PlannedFile, ScaffoldCommand, TemplateFile } from "./types.js";
import { validationScripts } from "../templates/runners.js";

const gitignoreStart = "# >>> ssealed ignore patterns >>>";
const gitignoreEnd = "# <<< ssealed ignore patterns <<<";

export async function planTemplateFile(params: {
  readonly targetRoot: string;
  readonly template: TemplateFile;
  readonly force: boolean;
  readonly command: ScaffoldCommand;
  readonly previous:
    | {
        readonly checksum: string;
        readonly generatedChecksum: string;
        readonly initialChecksum: string;
        readonly kind: string;
        readonly ownership: FileOwnership;
        readonly presence: FilePresence;
        readonly status: ManifestFileStatus;
      }
    | undefined;
}): Promise<PlannedFile> {
  const targetPath = resolveInsideTarget(params.targetRoot, params.template.path);
  const existing = await readExistingPath(targetPath);
  const generatedContent = normalizeText(params.template.content);
  const ownership = params.previous?.ownership ?? defaultOwnership(params.template);
  const presence = params.previous?.presence ?? defaultPresence(ownership);
  const previousChecksum = params.previous?.checksum;
  const previousGeneratedChecksum = params.previous?.generatedChecksum;
  const previousInitialChecksum = params.previous?.initialChecksum;
  const previousStatus = params.previous?.status ?? "active";
  if (existing.kind !== "missing" && existing.kind !== "file") {
    return {
      ...params.template,
      action: "conflict",
      content: generatedContent,
      ownership,
      presence,
      previousChecksum,
      reason: existingPathConflictReason(existing.kind),
    };
  }

  const existingContent = existing.kind === "file" ? existing.content : undefined;
  const previouslyGenerated =
    existingContent !== undefined && previousGeneratedChecksum !== undefined
      ? previousGeneratedChecksum === checksumExisting(existingContent)
      : undefined;

  if (ownership === "seeded" && params.command !== "init") {
    if (existingContent === undefined && previousChecksum !== undefined) {
      return {
        ...params.template,
        action: "retired",
        content: generatedContent,
        ownership,
        presence,
        manifestStatus: "retired",
        previousChecksum,
        previousGeneratedChecksum,
        previousInitialChecksum,
        reason: "Seeded file is absent and remains retired unless init creates a fresh scaffold.",
      };
    }

    if (existingContent !== undefined && previousStatus === "retired") {
      return {
        ...params.template,
        action: "customized",
        content: normalizeText(existingContent),
        existingContent,
        ownership,
        presence,
        manifestStatus: "active",
        previousChecksum,
        previousGeneratedChecksum,
        previousInitialChecksum,
        previouslyGenerated,
        reason: "Previously retired seeded file exists again and is accepted as project-owned content.",
      };
    }
  }

  if (params.template.merge === "gitignore") {
    return withLifecycle(
      planGitignore(params.template, existingContent, generatedContent, params.force, previouslyGenerated),
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
    );
  }

  if (params.template.merge === "package-json") {
    return withLifecycle(
      planPackageJson(params.template, existingContent, params.force, previouslyGenerated),
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
    );
  }

  if (params.template.merge === "manifest") {
    return withLifecycle(
      planManifest(params.template, existingContent, generatedContent, params.force, previouslyGenerated),
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
    );
  }

  if (existingContent === undefined) {
    return { ...params.template, action: "create", content: generatedContent, ownership, presence, previousChecksum, previousGeneratedChecksum, previousInitialChecksum };
  }

  if (normalizeText(existingContent) === generatedContent) {
    return {
      ...params.template,
      action: "unchanged",
      content: generatedContent,
      existingContent,
      previouslyGenerated,
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
    };
  }

  if (params.force && previouslyGenerated === true) {
    return {
      ...params.template,
      action: "overwrite",
      content: generatedContent,
      existingContent,
      previouslyGenerated,
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
    };
  }

  if (ownership === "seeded" && params.command !== "init") {
    return {
      ...params.template,
      action: "customized",
      content: normalizeText(existingContent),
      existingContent,
      previouslyGenerated,
      ownership,
      presence,
      previousChecksum,
      previousGeneratedChecksum,
      previousInitialChecksum,
      reason: "Seeded file has project-owned edits and is no longer treated as scaffold drift.",
    };
  }

  return {
    ...params.template,
    action: "conflict",
    content: generatedContent,
    existingContent,
    previouslyGenerated,
    ownership,
    presence,
    previousChecksum,
    previousGeneratedChecksum,
    previousInitialChecksum,
    reason:
      params.force && previouslyGenerated !== true
        ? "Existing file differs from the generated checksum recorded for this path in .ssealed/manifest.json."
        : "Existing file differs from generated scaffold content.",
  };
}

export async function writePlannedFiles(targetRoot: string, files: readonly PlannedFile[]): Promise<readonly string[]> {
  const written: string[] = [];
  const createdDirectories: string[] = [];
  await ensureDirectoryInsideTarget(targetRoot, targetRoot);
  const writableFiles = files.filter(
    (file) => file.action !== "unchanged" && file.action !== "conflict" && file.action !== "customized" && file.action !== "retired",
  );

  for (const file of writableFiles) {
    const targetPath = resolveInsideTarget(targetRoot, file.path);
    await assertNoSymlinkInPath(targetRoot, targetPath);
  }

  try {
    for (const file of writableFiles) {
      const targetPath = resolveInsideTarget(targetRoot, file.path);
      const targetDir = path.dirname(targetPath);
      createdDirectories.push(...(await missingDirectoryChain(targetRoot, targetDir)));
      await mkdir(targetDir, { recursive: true });
      await assertNoSymlinkInPath(targetRoot, targetPath);
      await assertExpectedWriteState(targetPath, file);
      await writeTextFileAtomically(targetPath, normalizeText(file.content));
      written.push(file.path);
    }
  } catch (error) {
    await rollbackWrittenFiles(targetRoot, writableFiles, written);
    await cleanupCreatedDirectories(createdDirectories);
    throw error;
  }

  return written;
}

type ExistingPath =
  | { readonly kind: "missing" }
  | { readonly kind: "file"; readonly content: string }
  | { readonly kind: "symlink" | "directory" | "other" };

async function readExistingPath(filePath: string): Promise<ExistingPath> {
  const stat = await lstat(filePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });

  if (stat === undefined) {
    return { kind: "missing" };
  }
  if (stat.isSymbolicLink()) {
    return { kind: "symlink" };
  }
  if (stat.isDirectory()) {
    return { kind: "directory" };
  }
  if (!stat.isFile()) {
    return { kind: "other" };
  }
  return { kind: "file", content: await readFile(filePath, "utf8") };
}

function existingPathConflictReason(kind: Exclude<ExistingPath["kind"], "missing" | "file">): string {
  if (kind === "symlink") {
    return "Existing path is a symlink and will not be followed or overwritten.";
  }
  if (kind === "directory") {
    return "Existing path is a directory, not a regular file.";
  }
  return "Existing path is not a regular file.";
}

async function assertExpectedWriteState(targetPath: string, file: PlannedFile): Promise<void> {
  const current = await readExistingPath(targetPath);
  if (file.existingContent === undefined) {
    if (current.kind === "missing") {
      return;
    }
    throw new Error(`Refusing to write ${file.path}: file appeared after the scaffold plan was created.`);
  }

  if (current.kind !== "file") {
    throw new Error(`Refusing to write ${file.path}: file changed after the scaffold plan was created.`);
  }
  if (current.content !== file.existingContent) {
    throw new Error(`Refusing to write ${file.path}: file content changed after the scaffold plan was created.`);
  }
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

  if (parsed.scripts !== undefined && !isRecord(parsed.scripts)) {
    return {
      ...template,
      action: "conflict",
      content: template.content,
      existingContent,
      previouslyGenerated,
      reason: "Existing package.json scripts field is not an object.",
    };
  }

  const currentScripts = parsed.scripts ?? {};
  const nextScripts = { ...currentScripts };
  const userOwnedScripts = Object.entries(scripts)
    .filter(([name]) => name in nextScripts && !isGeneratedValidationScript(nextScripts[name]))
    .map(([name]) => name);
  if (userOwnedScripts.length > 0) {
    if (force) {
      return {
        ...template,
        action: "conflict",
        content: template.content,
        existingContent,
        previouslyGenerated,
        reason: `Existing package.json has user-owned validation scripts: ${userOwnedScripts.join(", ")}.`,
      };
    }
  }
  for (const [name, value] of Object.entries(scripts)) {
    if (force || !(name in nextScripts) || isGeneratedValidationScript(nextScripts[name])) {
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

  return { ...template, action: force ? "overwrite" : "merge", content: generatedContent, existingContent, previouslyGenerated };
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

async function missingDirectoryChain(targetRoot: string, targetDir: string): Promise<string[]> {
  const root = path.resolve(targetRoot);
  const resolvedDir = path.resolve(targetDir);
  const relative = path.relative(root, resolvedDir);
  const parts = relative === "" ? [] : relative.split(path.sep).filter(Boolean);
  const missing: string[] = [];
  let current = root;

  for (const part of parts) {
    current = path.join(current, part);
    const stat = await lstat(current).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (stat === undefined) {
      missing.push(current);
    }
  }

  return missing;
}

async function cleanupCreatedDirectories(directories: readonly string[]): Promise<void> {
  const unique = [...new Set(directories)];
  for (const directory of unique.reverse()) {
    await rmdir(directory).catch(() => undefined);
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

function defaultOwnership(template: TemplateFile): FileOwnership {
  if (template.merge === "gitignore" || template.merge === "package-json") {
    return "block-managed";
  }
  return "seeded";
}

function defaultPresence(ownership: FileOwnership): FilePresence {
  return ownership === "seeded" ? "optional" : "required";
}

function withLifecycle(
  file: PlannedFile,
  ownership: FileOwnership,
  presence: FilePresence,
  previousChecksum: string | undefined,
  previousGeneratedChecksum: string | undefined,
  previousInitialChecksum: string | undefined,
): PlannedFile {
  return { ...file, ownership, presence, previousChecksum, previousGeneratedChecksum, previousInitialChecksum };
}
