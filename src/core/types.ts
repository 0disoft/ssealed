export const scopes = ["backend", "frontend", "fullstack", "general", "mobile", "infra", "data"] as const;
export type Scope = (typeof scopes)[number];

export const profiles = [
  "generic",
  "cli-tool",
  "api-service",
  "desktop-app",
  "library",
  "web-app",
  "mobile-app",
  "sdk",
  "worker-service",
  "infra-module",
  "data-pipeline",
  "github-action",
  "browser-extension",
  "plugin",
  "docs-site",
  "monorepo",
] as const;
export type Profile = (typeof profiles)[number];
export type Addon = Exclude<Profile, "generic">;

export const addons = profiles.filter((profile): profile is Addon => profile !== "generic");

export const densities = ["minimal", "standard", "strict"] as const;
export type Density = (typeof densities)[number];

export const runners = ["none", "make", "just", "task", "npm", "pnpm"] as const;
export type Runner = (typeof runners)[number];

export const fileKinds = [
  "document",
  "contract",
  "agent",
  "checklist",
  "validation",
  "diagram",
  "github",
  "runner",
  "manifest",
  "hygiene",
] as const;
export type FileKind = (typeof fileKinds)[number];

export interface TemplateFile {
  readonly path: string;
  readonly kind: FileKind;
  readonly content: string;
  readonly merge?: "gitignore" | "package-json" | "manifest";
  readonly runner?: Runner;
}

export type PlannedAction = "create" | "unchanged" | "conflict" | "overwrite" | "merge";
export type FileOwnership = "seeded" | "managed" | "block-managed" | "project-owned";
export type FilePresence = "required" | "optional";
export type ManifestFileStatus = "active" | "retired";

export interface PlannedFile {
  readonly path: string;
  readonly kind: FileKind;
  readonly action: PlannedAction | "customized" | "retired";
  readonly content: string;
  readonly existingContent?: string;
  readonly previouslyGenerated?: boolean | undefined;
  readonly reason?: string | undefined;
  readonly merge?: TemplateFile["merge"];
  readonly ownership?: FileOwnership;
  readonly presence?: FilePresence;
  readonly manifestStatus?: ManifestFileStatus;
  readonly previousChecksum?: string | undefined;
  readonly previousGeneratedChecksum?: string | undefined;
  readonly previousInitialChecksum?: string | undefined;
}

export interface ManifestFile {
  readonly path: string;
  readonly checksum: string;
  readonly kind: FileKind;
  readonly ownership: FileOwnership;
  readonly presence: FilePresence;
  readonly status: ManifestFileStatus;
  readonly initialChecksum: string;
  readonly acceptedChecksum: string;
  readonly generatedChecksum: string;
}

export interface Manifest {
  readonly tool: "ssealed";
  readonly version: string;
  readonly generatedAt: string;
  readonly scope: Scope;
  readonly profile: Profile;
  readonly addons: readonly Addon[];
  readonly density: Density;
  readonly runner: Runner;
  readonly files: readonly ManifestFile[];
}

export type ScaffoldCommand = "init" | "update" | "upgrade";

export interface ScaffoldResult {
  readonly command: ScaffoldCommand;
  readonly target: string;
  readonly scope: Scope;
  readonly profile: Profile;
  readonly addons: readonly Addon[];
  readonly density: Density;
  readonly runner: Runner;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly files: readonly PlannedFile[];
  readonly conflicts: readonly PlannedFile[];
  readonly warnings: readonly ScaffoldWarning[];
  readonly written: readonly string[];
}

export type ScaffoldWarningCode = "INVALID_MANIFEST";

export interface ScaffoldWarning {
  readonly code: ScaffoldWarningCode;
  readonly path: string;
  readonly message: string;
}

export interface InitOptions {
  readonly command?: ScaffoldCommand;
  readonly target: string;
  readonly scope: Scope;
  readonly profile?: Profile;
  readonly addons?: readonly Addon[];
  readonly density?: Density;
  readonly runner: Runner;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly breakStaleLock?: boolean;
}

export function normalizeScope(value: string): Scope | undefined {
  if (value === "design") {
    return "general";
  }
  return isScope(value) ? value : undefined;
}

export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && scopes.includes(value as Scope);
}

export function isProfile(value: unknown): value is Profile {
  return typeof value === "string" && profiles.includes(value as Profile);
}

export function isAddon(value: unknown): value is Addon {
  return typeof value === "string" && addons.includes(value as Addon);
}

export function normalizeAddons(values: readonly Addon[]): readonly Addon[] {
  const selected = new Set(values);
  return addons.filter((addon) => selected.has(addon));
}
