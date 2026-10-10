import { randomUUID } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { link, lstat, mkdir, open, readFile, rename, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { normalizeText, sha256 } from "./checksum.js";
import { SsealedError } from "./errors.js";
import { findGitignoreManagedBlocks } from "./gitignore-block.js";
import { parseJsonObject, preserveJsonBom } from "./json.js";
import { assertNoSymlinkInParentPath, assertNoSymlinkInPath, ensureDirectoryInsideTarget, resolveInsideTarget } from "./path-safety.js";
import { getScaffoldInterruptContext, withScaffoldSignalHandling, type ScaffoldInterruptContext } from "./signals.js";
import type { FileOwnership, FilePresence, ManifestFileStatus, PlannedFile, ScaffoldCommand, TemplateFile } from "./types.js";
import { validationScripts } from "../templates/runners.js";

const generatedValidationScripts = new Set([...Object.values(validationScripts("npm")), ...Object.values(validationScripts("pnpm"))]);
const writeConcurrency = 8;

export interface FileWriterHooks {
  readonly beforeCommit?: (relativePath: string, targetPath: string) => Promise<void>;
}

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
        readonly managedScripts?: Readonly<Record<string, string>>;
      }
    | undefined;
}): Promise<PlannedFile> {
  const targetPath = resolveInsideTarget(params.targetRoot, params.template.path);
  await assertNoSymlinkInParentPath(params.targetRoot, targetPath);
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

  if (ownership === "project-owned" && params.command !== "init") {
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
        reason: "Project-owned file is outside ssealed management.",
      };
    }

    if (existingContent !== undefined) {
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
        reason: "Project-owned file is outside ssealed management.",
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

  if (params.command === "adopt" && params.template.merge === "package-json" && existingContent !== undefined) {
    return planAdoptedProjectOwnedFile(params.template, existingContent, generatedContent, previouslyGenerated);
  }

  if (params.template.merge === "package-json") {
    return withLifecycle(
      planPackageJson(params.template, existingContent, params.force, previouslyGenerated, params.previous),
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

  if (params.command === "adopt") {
    return planAdoptedProjectOwnedFile(params.template, existingContent, generatedContent, previouslyGenerated);
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
    if (params.command === "upgrade" && previouslyGenerated === true) {
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
        reason: "Unmodified generated file needs to change for this upgrade. Rerun upgrade with --force to update it before accepting the new settings.",
      };
    }
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
      reason: params.command === "upgrade"
        ? "Seeded file has project-owned edits; review it manually against the upgraded scaffold settings."
        : "Seeded file has project-owned edits and is no longer treated as scaffold drift.",
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

function planAdoptedProjectOwnedFile(
  template: TemplateFile,
  existingContent: string,
  generatedContent: string,
  previouslyGenerated: boolean | undefined,
): PlannedFile {
  const generatedChecksum = sha256(generatedContent);
  return {
    ...template,
    action: "customized",
    content: normalizeText(existingContent),
    existingContent,
    previouslyGenerated,
    ownership: "project-owned",
    presence: "optional",
    previousGeneratedChecksum: generatedChecksum,
    previousInitialChecksum: generatedChecksum,
    reason: "Existing file was adopted as project-owned content.",
  };
}

export async function writePlannedFiles(
  targetRoot: string,
  files: readonly PlannedFile[],
  hooks: FileWriterHooks = {},
): Promise<readonly string[]> {
  return withScaffoldSignalHandling(() => writePlannedFilesInterruptibly(targetRoot, files, hooks));
}

async function writePlannedFilesInterruptibly(
  targetRoot: string,
  files: readonly PlannedFile[],
  hooks: FileWriterHooks,
): Promise<readonly string[]> {
  const written: string[] = [];
  const createdDirectories: string[] = [];
  const interrupt = getScaffoldInterruptContext();
  await ensureDirectoryInsideTarget(targetRoot, targetRoot);
  interrupt?.throwIfInterrupted();
  const writableFiles = files.filter(
    (file) => file.action !== "unchanged" && file.action !== "conflict" && file.action !== "customized" && file.action !== "retired",
  );

  for (const file of writableFiles) {
    const targetPath = resolveInsideTarget(targetRoot, file.path);
    await assertNoSymlinkInPath(targetRoot, targetPath);
  }
  interrupt?.throwIfInterrupted();

  try {
    const manifestFiles = writableFiles.filter((file) => file.path === ".ssealed/manifest.json");
    const contentFiles = writableFiles.filter((file) => file.path !== ".ssealed/manifest.json");
    await writeFilesInBatches(targetRoot, contentFiles, written, createdDirectories, interrupt, hooks);
    await writeFilesInBatches(targetRoot, manifestFiles, written, createdDirectories, interrupt, hooks);
  } catch (error) {
    const recoveryErrors = [
      ...(await rollbackWrittenFiles(targetRoot, writableFiles, written)),
      ...(await cleanupCreatedDirectories(createdDirectories)),
    ];
    if (recoveryErrors.length > 0) {
      throw new AggregateError(
        [error, ...recoveryErrors],
        `Scaffold write failed: ${asError(error).message}; recovery was incomplete: ${recoveryErrors.map((failure) => failure.message).join("; ")}`,
      );
    }
    throw error;
  }

  if (written.length > 0) interrupt?.markCommitted();
  return written;
}

async function writeFilesInBatches(
  targetRoot: string,
  files: readonly PlannedFile[],
  written: string[],
  createdDirectories: string[],
  interrupt: ScaffoldInterruptContext | undefined,
  hooks: FileWriterHooks,
): Promise<void> {
  for (let start = 0; start < files.length; start += writeConcurrency) {
    interrupt?.throwIfInterrupted();
    const batch = files.slice(start, start + writeConcurrency);
    const results = await Promise.allSettled(batch.map((file) => writeOnePlannedFile(targetRoot, file, written, createdDirectories, hooks)));
    const failures: { readonly path: string; readonly error: unknown }[] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        failures.push({ path: (batch[index] as PlannedFile).path, error: result.reason });
      }
    }
    if (failures.length === 1) {
      throw failures[0]?.error;
    }
    if (failures.length > 1) {
      throw new AggregateError(
        failures.map((failure) => failure.error),
        `Scaffold writes failed: ${failures.map((failure) => `${failure.path}: ${asError(failure.error).message}`).join("; ")}`,
      );
    }
    interrupt?.throwIfInterrupted();
  }
}

async function writeOnePlannedFile(
  targetRoot: string,
  file: PlannedFile,
  written: string[],
  createdDirectories: string[],
  hooks: FileWriterHooks,
): Promise<void> {
  const targetPath = resolveInsideTarget(targetRoot, file.path);
  const targetDir = path.dirname(targetPath);
  createdDirectories.push(...(await missingDirectoryChain(targetRoot, targetDir)));
  await mkdir(targetDir, { recursive: true });
  await assertNoSymlinkInPath(targetRoot, targetPath);
  const expectedState = await assertExpectedWriteState(targetPath, file);
  await writeTextFileAtomically(targetPath, normalizeText(file.content), {
    createOnly: file.existingContent === undefined,
    ...(expectedState.kind === "file" ? { mode: expectedState.mode } : {}),
    beforeCommit: async () => {
      await hooks.beforeCommit?.(file.path, targetPath);
      await assertNoSymlinkInPath(targetRoot, targetPath);
      await assertExpectedWriteState(targetPath, file);
    },
    onCommit: () => {
      written.push(file.path);
    },
  });
}

type ExistingPath =
  | { readonly kind: "missing" }
  | { readonly kind: "file"; readonly content: string; readonly mode: number }
  | { readonly kind: "symlink" | "directory" | "other" | "invalid-encoding" };

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
  const bytes = await readFile(filePath);
  if (!isUtf8(bytes)) return { kind: "invalid-encoding" };
  return { kind: "file", content: bytes.toString("utf8"), mode: stat.mode };
}

function existingPathConflictReason(kind: Exclude<ExistingPath["kind"], "missing" | "file">): string {
  if (kind === "invalid-encoding") {
    return "Existing file is not valid UTF-8. Convert its encoding explicitly before running ssealed; the original bytes will not be rewritten.";
  }
  if (kind === "symlink") {
    return "Existing path is a symlink and will not be followed or overwritten.";
  }
  if (kind === "directory") {
    return "Existing path is a directory, not a regular file.";
  }
  return "Existing path is not a regular file.";
}

async function assertExpectedWriteState(targetPath: string, file: PlannedFile): Promise<ExistingPath> {
  const current = await readExistingPath(targetPath);
  if (file.existingContent === undefined) {
    if (current.kind === "missing") {
      return current;
    }
    throw new SsealedError("WRITE_FAILED", `Refusing to write ${file.path}: file appeared after the scaffold plan was created.`);
  }

  if (current.kind !== "file") {
    throw new SsealedError("WRITE_FAILED", `Refusing to write ${file.path}: file changed after the scaffold plan was created.`);
  }
  if (current.content !== file.existingContent) {
    throw new SsealedError("WRITE_FAILED", `Refusing to write ${file.path}: file content changed after the scaffold plan was created.`);
  }
  return current;
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

  const blockRanges = findGitignoreManagedBlocks(existingContent);
  if (blockRanges === undefined || blockRanges.length > 1) {
    return {
      ...template,
      action: "conflict",
      content: generatedBlock,
      existingContent,
      previouslyGenerated,
      reason: "Existing .gitignore must contain exactly one complete ssealed managed block.",
    };
  }
  const blockRange = blockRanges[0];
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
  previous: { readonly checksum: string; readonly managedScripts?: Readonly<Record<string, string>> } | undefined,
): PlannedFile {
  const runner = template.runner === "pnpm" ? "pnpm" : "npm";
  const scripts = validationScripts(runner);

  if (existingContent === undefined) {
    return {
      ...template,
      action: "create",
      content: normalizeText(JSON.stringify({ scripts }, null, 2)),
      managedScripts: scripts,
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
  const priorManagedScripts = previous?.managedScripts;
  if (priorManagedScripts !== undefined) {
    const modified = Object.entries(priorManagedScripts)
      .filter(([name, value]) => Object.hasOwn(currentScripts, name) && currentScripts[name] !== value)
      .map(([name]) => name);
    if (modified.length > 0) {
      return {
        ...template,
        action: "conflict",
        content: template.content,
        existingContent,
        previouslyGenerated,
        reason: `Previously managed package.json scripts changed: ${modified.join(", ")}.`,
      };
    }
  }
  const userOwnedScripts = Object.entries(scripts)
    .filter(([name]) => name in nextScripts && !isGeneratedValidationScript(nextScripts[name]) && !Object.hasOwn(priorManagedScripts ?? {}, name))
    .map(([name]) => name);
  if (priorManagedScripts === undefined && userOwnedScripts.length > 0) {
    if ((force && previous === undefined) || (previous !== undefined && checksumExisting(existingContent) !== previous.checksum)) {
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
  const managedScripts: Record<string, string> = {};
  let scriptsChanged = false;
  for (const [name, value] of Object.entries(scripts)) {
    const owned = priorManagedScripts === undefined
      ? name in nextScripts && isGeneratedValidationScript(nextScripts[name])
      : Object.hasOwn(priorManagedScripts, name);
    if (!(name in nextScripts) || owned) {
      scriptsChanged ||= nextScripts[name] !== value;
      nextScripts[name] = value;
      managedScripts[name] = value;
    }
  }
  if (!scriptsChanged) {
    return { ...template, action: "unchanged", content: normalizeText(existingContent), existingContent, previouslyGenerated, managedScripts };
  }
  const nextPackage = { ...parsed, scripts: nextScripts };
  const indent = detectJsonIndent(existingContent);
  const nextContent = preserveJsonBom(existingContent, normalizeText(JSON.stringify(nextPackage, null, indent)));
  if (normalizeText(existingContent) === nextContent) {
    return { ...template, action: "unchanged", content: nextContent, existingContent, previouslyGenerated, managedScripts };
  }
  return { ...template, action: "merge", content: nextContent, existingContent, previouslyGenerated, managedScripts };
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

  return { ...template, action: force ? "overwrite" : "merge", content: preserveJsonBom(existingContent, generatedContent), existingContent, previouslyGenerated };
}

function checksumExisting(content: string): string {
  return sha256(content);
}

function detectJsonIndent(content: string): string | number {
  const match = /(?:\r\n?|\n)([ \t]+)"/u.exec(content);
  return match?.[1] ?? (/[\r\n]/u.test(content.trimEnd()) ? 2 : 0);
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
  return sameJsonValue(existingComparable, generated);
}

type JsonComparable = null | boolean | number | string | readonly JsonComparable[] | { readonly [key: string]: JsonComparable };

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (!isJsonComparable(left) || !isJsonComparable(right)) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameJsonValue(value, right[index]));
  }
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) {
    return false;
  }
  const leftRecord = left as { readonly [key: string]: JsonComparable };
  const rightRecord = right as { readonly [key: string]: JsonComparable };
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && sameJsonValue(leftRecord[key], rightRecord[key]));
}

function isJsonComparable(value: unknown): value is JsonComparable {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonComparable);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(isJsonComparable);
}

async function rollbackWrittenFiles(
  targetRoot: string,
  files: readonly PlannedFile[],
  writtenPaths: readonly string[],
): Promise<Error[]> {
  const failures: Error[] = [];
  for (const relativePath of [...writtenPaths].reverse()) {
    const file = files.find((candidate) => candidate.path === relativePath);
    if (file === undefined) {
      continue;
    }
    const targetPath = resolveInsideTarget(targetRoot, relativePath);
    try {
      await assertNoSymlinkInPath(targetRoot, targetPath);
      const current = await readExistingPath(targetPath);
      if (current.kind === "missing") {
        continue;
      }
      if (current.kind !== "file" || current.content !== normalizeText(file.content)) {
        throw new Error(`Rollback skipped ${relativePath} because it changed after ssealed wrote it.`);
      }
      if (file.existingContent === undefined) {
        await rm(targetPath);
      } else {
        await writeTextFileAtomically(targetPath, file.existingContent, {
          mode: current.mode,
          beforeCommit: async () => {
            await assertNoSymlinkInPath(targetRoot, targetPath);
            await assertExpectedWriteState(targetPath, { ...file, existingContent: normalizeText(file.content) });
          },
        });
      }
    } catch (error) {
      failures.push(asError(error));
    }
  }
  return failures;
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

async function cleanupCreatedDirectories(directories: readonly string[]): Promise<Error[]> {
  const failures: Error[] = [];
  const unique = [...new Set(directories)];
  for (const directory of unique.reverse()) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (!isNodeError(error) || (error.code !== "ENOENT" && error.code !== "ENOTEMPTY" && error.code !== "EEXIST")) {
        failures.push(asError(error));
      }
    }
  }
  return failures;
}

function isGeneratedValidationScript(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return generatedValidationScripts.has(value);
}

export async function writeTextFileAtomically(
  targetPath: string,
  content: string,
  options: {
    readonly createOnly?: boolean;
    readonly mode?: number;
    readonly beforeCommit?: () => Promise<void>;
    readonly onCommit?: () => void;
  } = {},
): Promise<void> {
  const temporaryPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`);
  let temporaryHandle: Awaited<ReturnType<typeof open>> | undefined;
  let temporaryCreated = false;
  let temporaryIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined;
  try {
    temporaryHandle = await open(temporaryPath, "wx", 0o600);
    temporaryCreated = true;
    temporaryIdentity = await temporaryHandle.stat({ bigint: true });
    await temporaryHandle.writeFile(content, "utf8");
    if (options.mode !== undefined) {
      await temporaryHandle.chmod(options.mode & 0o7777);
    }
    await temporaryHandle.close();
    temporaryHandle = undefined;
    await options.beforeCommit?.();
    if (!(await assertTemporaryFileOwnership(temporaryPath, temporaryIdentity))) {
      throw new SsealedError("WRITE_FAILED", `Temporary file disappeared before publication: ${temporaryPath}`);
    }
    if (options.createOnly) {
      await link(temporaryPath, targetPath);
      options.onCommit?.();
      if (await assertTemporaryFileOwnership(temporaryPath, temporaryIdentity)) {
        await rm(temporaryPath);
      }
      temporaryCreated = false;
    } else {
      await rename(temporaryPath, targetPath);
      temporaryCreated = false;
      options.onCommit?.();
    }
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (temporaryHandle !== undefined) {
      try {
        await temporaryHandle.close();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (temporaryCreated) {
      try {
        if (await assertTemporaryFileOwnership(temporaryPath, temporaryIdentity)) {
          await rm(temporaryPath, { force: true });
        }
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `Atomic write failed: ${asError(error).message}; temporary-file cleanup also failed for ${targetPath}: ${cleanupErrors.map((failure) => asError(failure).message).join("; ")}`,
      );
    }
    throw error;
  }
}

async function assertTemporaryFileOwnership(
  temporaryPath: string,
  identity: { readonly dev: bigint; readonly ino: bigint } | undefined,
): Promise<boolean> {
  const current = await lstat(temporaryPath, { bigint: true }).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    throw error;
  });
  if (current === undefined) return false;
  if (identity === undefined || !current.isFile() || current.dev !== identity.dev || current.ino !== identity.ino) {
    throw new SsealedError("WRITE_FAILED", `Temporary file ownership changed; preserving the replacement: ${temporaryPath}`);
  }
  return true;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function defaultOwnership(template: TemplateFile): FileOwnership {
  if (template.merge === "gitignore" || template.merge === "package-json") {
    return "block-managed";
  }
  return "seeded";
}

function defaultPresence(ownership: FileOwnership): FilePresence {
  return ownership === "seeded" || ownership === "project-owned" ? "optional" : "required";
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
