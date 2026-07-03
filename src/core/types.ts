export const scopes = ["backend", "frontend", "fullstack", "design"] as const;
export type Scope = (typeof scopes)[number];

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

export interface PlannedFile {
  readonly path: string;
  readonly kind: FileKind;
  readonly action: PlannedAction;
  readonly content: string;
  readonly existingContent?: string;
  readonly previouslyGenerated?: boolean | undefined;
  readonly reason?: string;
  readonly merge?: TemplateFile["merge"];
}

export interface ManifestFile {
  readonly path: string;
  readonly checksum: string;
  readonly kind: FileKind;
}

export interface Manifest {
  readonly tool: "ssealed";
  readonly version: string;
  readonly generatedAt: string;
  readonly scope: Scope;
  readonly runner: Runner;
  readonly files: readonly ManifestFile[];
}

export interface ScaffoldResult {
  readonly target: string;
  readonly scope: Scope;
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
  readonly target: string;
  readonly scope: Scope;
  readonly runner: Runner;
  readonly dryRun: boolean;
  readonly force: boolean;
}
