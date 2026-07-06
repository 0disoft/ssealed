import { sha256 } from "./checksum.js";
import type { Addon, Density, Manifest, ManifestFile, PlannedFile, Profile, Runner, Scope } from "./types.js";

export const toolVersion = "0.5.0";

export function createManifest(params: {
  readonly scope: Scope;
  readonly profile: Profile;
  readonly addons: readonly Addon[];
  readonly density: Density;
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
    profile: params.profile,
    addons: params.addons,
    density: params.density,
    runner: params.runner,
    files,
  };
}

export function formatManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
