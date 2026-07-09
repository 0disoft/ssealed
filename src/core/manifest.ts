import { sha256 } from "./checksum.js";
import type { Addon, Density, FileOwnership, FilePresence, Manifest, ManifestFile, PlannedFile, Profile, Runner, Scope } from "./types.js";

export const toolVersion = "0.6.7";

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
    .map((file) => {
      const acceptedChecksum = file.action === "retired" ? (file.previousChecksum ?? sha256(file.content)) : sha256(file.content);
      const generatedChecksum =
        file.action === "customized" || file.action === "retired"
          ? (file.previousGeneratedChecksum ?? file.previousInitialChecksum ?? acceptedChecksum)
          : acceptedChecksum;
      return {
        path: file.path,
        checksum: acceptedChecksum,
        kind: file.kind,
        ownership: file.ownership ?? defaultOwnership(file),
        presence: file.presence ?? defaultPresence(file),
        status: file.manifestStatus ?? (file.action === "retired" ? "retired" : "active"),
        initialChecksum: file.previousInitialChecksum ?? generatedChecksum,
        acceptedChecksum,
        generatedChecksum,
      };
    })
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

function defaultOwnership(file: PlannedFile): FileOwnership {
  if (file.merge === "gitignore" || file.merge === "package-json") {
    return "block-managed";
  }
  return "seeded";
}

function defaultPresence(file: PlannedFile): FilePresence {
  const ownership = file.ownership ?? defaultOwnership(file);
  return ownership === "seeded" || ownership === "project-owned" ? "optional" : "required";
}
