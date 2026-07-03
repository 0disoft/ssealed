import { sha256 } from "./checksum.js";
import type { Manifest, ManifestFile, PlannedFile, Runner, Scope } from "./types.js";

export const toolVersion = "0.2.0";

export function createManifest(params: {
  readonly scope: Scope;
  readonly runner: Runner;
  readonly generatedAt: string;
  readonly files: readonly PlannedFile[];
}): Manifest {
  const files: ManifestFile[] = params.files
    .filter((file) => file.path !== ".ssealed/manifest.json")
    .map((file) => ({
      path: file.path,
      checksum: sha256(file.content),
      kind: file.kind,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    tool: "ssealed",
    version: toolVersion,
    generatedAt: params.generatedAt,
    scope: params.scope,
    runner: params.runner,
    files,
  };
}

export function formatManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
