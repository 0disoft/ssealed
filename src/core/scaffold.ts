import path from "node:path";
import { readFile } from "node:fs/promises";
import { normalizeText } from "./checksum.js";
import { formatManifest, createManifest } from "./manifest.js";
import { planTemplateFile, writePlannedFiles } from "./file-writer.js";
import type { InitOptions, PlannedFile, ScaffoldResult } from "./types.js";
import { templateFilesFor } from "../templates/index.js";

export async function planScaffold(options: InitOptions): Promise<readonly PlannedFile[]> {
  const targetRoot = path.resolve(options.target);
  const templates = templateFilesFor(options.scope, options.runner);
  const previousManifest = await readPreviousManifest(targetRoot);
  const planned = await Promise.all(
    templates.map((template) =>
      planTemplateFile({
        targetRoot,
        template,
        force: options.force,
        previousChecksum: previousManifest.get(template.path),
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
    previousChecksum: previousManifest.get(".ssealed/manifest.json"),
  });

  return [...planned, { ...manifestPlan, content: normalizeText(manifestContent) }];
}

async function readPreviousManifest(targetRoot: string): Promise<ReadonlyMap<string, string>> {
  const manifestPath = path.join(path.resolve(targetRoot), ".ssealed", "manifest.json");
  const content = await readFile(manifestPath, "utf8").catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (content === undefined) {
    return new Map();
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (!isManifestLike(parsed)) {
      return new Map();
    }
    return new Map(parsed.files.map((file) => [file.path, file.checksum]));
  } catch {
    return new Map();
  }
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
  const files = await planScaffold(options);
  const conflicts = files.filter((file) => file.action === "conflict");
  if (conflicts.length > 0 || options.dryRun) {
    return {
      target: path.resolve(options.target),
      scope: options.scope,
      runner: options.runner,
      dryRun: options.dryRun,
      force: options.force,
      files,
      conflicts,
      written: [],
    };
  }

  const written = await writePlannedFiles(path.resolve(options.target), files);
  return {
    target: path.resolve(options.target),
    scope: options.scope,
    runner: options.runner,
    dryRun: false,
    force: options.force,
    files,
    conflicts,
    written,
  };
}
