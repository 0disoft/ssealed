import path from "node:path";
import { open, readFile, rm } from "node:fs/promises";
import { normalizeText } from "./checksum.js";
import { formatManifest, createManifest } from "./manifest.js";
import { planTemplateFile, writePlannedFiles } from "./file-writer.js";
import { assertNoSymlinkInPath, ensureDirectoryInsideTarget, resolveInsideTarget } from "./path-safety.js";
import type { InitOptions, PlannedFile, ScaffoldResult, ScaffoldWarning } from "./types.js";
import { templateFilesFor } from "../templates/index.js";

export async function planScaffold(options: InitOptions): Promise<readonly PlannedFile[]> {
  return (await planScaffoldWithWarnings(options)).files;
}

async function planScaffoldWithWarnings(options: InitOptions): Promise<{
  readonly files: readonly PlannedFile[];
  readonly warnings: readonly ScaffoldWarning[];
}> {
  const targetRoot = path.resolve(options.target);
  const templates = templateFilesFor(options.scope, options.runner);
  const previousManifest = await readPreviousManifest(targetRoot);
  const planned = await Promise.all(
    templates.map((template) =>
      planTemplateFile({
        targetRoot,
        template,
        force: options.force,
        previousChecksum: previousManifest.checksums.get(template.path),
      }),
    ),
  );

  const manifest = createManifest({
    scope: options.scope,
    runner: options.runner,
    generatedAt: new Date().toISOString(),
    files: planned,
  });
  const manifestContent = formatManifest(manifest);
  const manifestPlan = await planTemplateFile({
    targetRoot,
    force: options.force,
    template: {
      path: ".ssealed/manifest.json",
      kind: "manifest",
      content: manifestContent,
      merge: "manifest",
    },
    previousChecksum: previousManifest.checksums.get(".ssealed/manifest.json"),
  });

  return { files: [...planned, { ...manifestPlan, content: normalizeText(manifestContent) }], warnings: previousManifest.warnings };
}

async function readPreviousManifest(targetRoot: string): Promise<{
  readonly checksums: ReadonlyMap<string, string>;
  readonly warnings: readonly ScaffoldWarning[];
}> {
  const manifestPath = path.join(path.resolve(targetRoot), ".ssealed", "manifest.json");
  const content = await readFile(manifestPath, "utf8").catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (content === undefined) {
    return { checksums: new Map(), warnings: [] };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (!isManifestLike(parsed)) {
      return { checksums: new Map(), warnings: [invalidManifestWarning()] };
    }
    return { checksums: new Map(parsed.files.map((file) => [file.path, file.checksum])), warnings: [] };
  } catch {
    return { checksums: new Map(), warnings: [invalidManifestWarning()] };
  }
}

function invalidManifestWarning(): ScaffoldWarning {
  return {
    code: "INVALID_MANIFEST",
    path: ".ssealed/manifest.json",
    message: "Existing .ssealed/manifest.json could not be parsed as a valid ssealed manifest and was ignored for ownership checks.",
  };
}

function isManifestLike(value: unknown): value is { readonly files: ReadonlyArray<{ readonly path: string; readonly checksum: string }> } {
  if (typeof value !== "object" || value === null || !("files" in value)) {
    return false;
  }
  const files = (value as { readonly files: unknown }).files;
  return Array.isArray(files) && files.every((file) => isManifestFileLike(file));
}

function isManifestFileLike(value: unknown): value is { readonly path: string; readonly checksum: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "checksum" in value &&
    typeof (value as { readonly path: unknown }).path === "string" &&
    typeof (value as { readonly checksum: unknown }).checksum === "string"
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export async function executeScaffold(options: InitOptions): Promise<ScaffoldResult> {
  if (options.dryRun) {
    const plan = await planScaffoldWithWarnings(options);
    const conflicts = plan.files.filter((file) => file.action === "conflict");
    return {
      target: path.resolve(options.target),
      scope: options.scope,
      runner: options.runner,
      dryRun: options.dryRun,
      force: options.force,
      files: plan.files,
      conflicts,
      warnings: plan.warnings,
      written: [],
    };
  }

  return withScaffoldLock(path.resolve(options.target), async () => {
    const plan = await planScaffoldWithWarnings(options);
    const conflicts = plan.files.filter((file) => file.action === "conflict");
    if (conflicts.length > 0) {
      return {
        target: path.resolve(options.target),
        scope: options.scope,
        runner: options.runner,
        dryRun: false,
        force: options.force,
        files: plan.files,
        conflicts,
        warnings: plan.warnings,
        written: [],
      };
    }

    const written = await writePlannedFiles(path.resolve(options.target), plan.files);
    return {
      target: path.resolve(options.target),
      scope: options.scope,
      runner: options.runner,
      dryRun: false,
      force: options.force,
      files: plan.files,
      conflicts,
      warnings: plan.warnings,
      written,
    };
  });
}

async function withScaffoldLock<T>(targetRoot: string, task: () => Promise<T>): Promise<T> {
  await ensureDirectoryInsideTarget(targetRoot, targetRoot);
  const lockPath = resolveInsideTarget(targetRoot, ".ssealed-init.lock");
  await assertNoSymlinkInPath(targetRoot, lockPath);

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let acquired = false;
  try {
    handle = await open(lockPath, "wx");
    acquired = true;
    await handle.writeFile(
      JSON.stringify(
        {
          tool: "ssealed",
          pid: process.pid,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
    await handle.close();
    handle = undefined;
    return await task();
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      throw new Error("Another ssealed init is already running for this target. Remove .ssealed-init.lock only after confirming it is stale.");
    }
    throw error;
  } finally {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
    if (acquired) {
      await rm(lockPath, { force: true }).catch(() => undefined);
    }
  }
}
