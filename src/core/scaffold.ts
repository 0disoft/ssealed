import path from "node:path";
import { open, readFile, rm, stat } from "node:fs/promises";
import { hostname } from "node:os";
import { normalizeText } from "./checksum.js";
import { SsealedError } from "./errors.js";
import { formatManifest, createManifest } from "./manifest.js";
import { planTemplateFile, writePlannedFiles } from "./file-writer.js";
import { assertNoSymlinkInPath, ensureDirectoryInsideTarget, resolveInsideTarget } from "./path-safety.js";
import { getScaffoldInterruptContext, withScaffoldSignalHandling } from "./signals.js";
import {
  isAddon,
  isProfile,
  normalizeAddons,
  normalizeScope,
  type Addon,
  type Density,
  type FileKind,
  type FileOwnership,
  type FilePresence,
  type InitOptions,
  type ManifestFileStatus,
  type PlannedFile,
  type Profile,
  type Runner,
  type ScaffoldCommand,
  type ScaffoldResult,
  type ScaffoldWarning,
  type Scope,
} from "./types.js";
import { templateFilesFor } from "../templates/index.js";

const staleLockAgeMs = 60 * 60 * 1000;
const maxManifestBytes = 1024 * 1024;

export async function planScaffold(options: InitOptions & { readonly previousManifest?: PreviousManifestState }): Promise<readonly PlannedFile[]> {
  return withScaffoldReadLock(path.resolve(options.target), async () => (await planScaffoldWithWarnings(options, options.previousManifest)).files);
}

async function planScaffoldWithWarnings(
  options: InitOptions,
  previousManifestOverride?: PreviousManifestState,
): Promise<{
  readonly files: readonly PlannedFile[];
  readonly warnings: readonly ScaffoldWarning[];
}> {
  const targetRoot = path.resolve(options.target);
  const command = options.command ?? "init";
  const profile = options.profile ?? "generic";
  const addons = normalizeAddons(options.addons ?? []);
  const density = options.density ?? "standard";
  const templates = templateFilesFor(options.scope, options.runner, profile, density, addons);
  const previousManifest = previousManifestOverride ?? (await readPreviousManifest(targetRoot));
  const planned = await Promise.all(
    templates.map((template) =>
      planTemplateFile({
        targetRoot,
        template,
        force: options.force,
        command,
        previous: previousManifest.files.get(template.path)?.kind === template.kind ? previousManifest.files.get(template.path) : undefined,
      }),
    ),
  );
  const plannedPaths = new Set(planned.map((file) => file.path));
  const retiredPreviousFiles =
    command === "init"
      ? []
      : [...previousManifest.files.entries()]
          .filter(([filePath]) => filePath !== ".ssealed/manifest.json" && !plannedPaths.has(filePath))
          .map(
            ([filePath, file]): PlannedFile => ({
              path: filePath,
              kind: file.kind,
              action: "retired",
              content: "",
              ownership: file.ownership,
              presence: file.presence,
              manifestStatus: "retired",
              previousChecksum: file.checksum,
              previousGeneratedChecksum: file.generatedChecksum,
              previousInitialChecksum: file.initialChecksum,
              reason: "File is outside the current scaffold settings and remains project-owned on disk.",
            }),
          );
  const manifestFiles = [...planned, ...retiredPreviousFiles];

  const manifest = createManifest({
    scope: options.scope,
    profile,
    addons,
    density,
    runner: options.runner,
    generatedAt: new Date().toISOString(),
    files: manifestFiles,
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
    command,
    previous: previousManifest.files.get(".ssealed/manifest.json")?.kind === "manifest" ? previousManifest.files.get(".ssealed/manifest.json") : undefined,
  });

  const settingsConflict = planManifestSettingsConflict(command, previousManifest.settings, {
    scope: options.scope,
    profile,
    addons,
    density,
    runner: options.runner,
    manifestContent,
  });

  return { files: [...manifestFiles, settingsConflict ?? manifestPlan], warnings: previousManifest.warnings };
}

export interface PreviousManifestSettings {
  readonly scope: Scope;
  readonly profile: Profile;
  readonly addons: readonly Addon[];
  readonly density: Density;
  readonly runner: Runner;
}

export interface PreviousManifestState {
  readonly version: string | undefined;
  readonly files: ReadonlyMap<
    string,
    {
      readonly checksum: string;
      readonly generatedChecksum: string;
      readonly initialChecksum: string;
      readonly kind: FileKind;
      readonly ownership: FileOwnership;
      readonly presence: FilePresence;
      readonly status: ManifestFileStatus;
    }
  >;
  readonly settings: PreviousManifestSettings | undefined;
  readonly warnings: readonly ScaffoldWarning[];
}

export async function readPreviousManifest(targetRoot: string): Promise<PreviousManifestState> {
  const manifestPath = path.join(path.resolve(targetRoot), ".ssealed", "manifest.json");
  await assertNoSymlinkInPath(targetRoot, manifestPath);
  const manifestStat = await stat(manifestPath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (manifestStat === undefined) {
    return { version: undefined, files: new Map(), settings: undefined, warnings: [] };
  }
  if (manifestStat.size > maxManifestBytes) {
    return { version: undefined, files: new Map(), settings: undefined, warnings: [invalidManifestWarning("Existing .ssealed/manifest.json exceeds the supported 1 MiB size limit.")] };
  }
  const content = await readFile(manifestPath, "utf8").catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (content === undefined) {
    return { version: undefined, files: new Map(), settings: undefined, warnings: [] };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (!isManifestLike(parsed)) {
      return { version: undefined, files: new Map(), settings: undefined, warnings: [invalidManifestWarning()] };
    }
    return {
      version: typeof parsed.version === "string" ? parsed.version : undefined,
      files: new Map(
        parsed.files.map((file) => [
          file.path,
          {
            checksum: file.acceptedChecksum ?? file.checksum,
            generatedChecksum: file.generatedChecksum ?? file.initialChecksum ?? file.checksum,
            initialChecksum: file.initialChecksum ?? file.generatedChecksum ?? file.checksum,
            kind: file.kind,
            ownership: normalizeFileOwnership(file.ownership, file.path),
            presence: normalizeFilePresence(file.presence, file.ownership, file.path),
            status: normalizeManifestFileStatus(file.status),
          },
        ]),
      ),
      settings: {
        scope: normalizeManifestScope(parsed.scope),
        profile: parsed.profile ?? "generic",
        addons: normalizeManifestAddons(parsed.addons),
        density: parsed.density ?? "standard",
        runner: parsed.runner,
      },
      warnings: [],
    };
  } catch {
    return { version: undefined, files: new Map(), settings: undefined, warnings: [invalidManifestWarning()] };
  }
}

function invalidManifestWarning(message = "Existing .ssealed/manifest.json could not be parsed as a valid ssealed manifest and was ignored for ownership checks."): ScaffoldWarning {
  return {
    code: "INVALID_MANIFEST",
    path: ".ssealed/manifest.json",
    message,
  };
}

function isManifestLike(value: unknown): value is {
  readonly tool: "ssealed";
  readonly version?: string;
  readonly scope: string;
  readonly profile?: Profile;
  readonly addons?: readonly Addon[];
  readonly density?: Density;
  readonly runner: Runner;
  readonly files: ReadonlyArray<{
    readonly path: string;
    readonly checksum: string;
    readonly acceptedChecksum?: string;
    readonly generatedChecksum?: string;
    readonly initialChecksum?: string;
    readonly kind: FileKind;
    readonly ownership?: FileOwnership;
    readonly presence?: FilePresence;
    readonly status?: ManifestFileStatus;
  }>;
} {
  if (typeof value !== "object" || value === null || !("files" in value)) {
    return false;
  }
  const candidate = value as {
    readonly tool?: unknown;
    readonly version?: unknown;
    readonly scope?: unknown;
    readonly profile?: unknown;
    readonly addons?: unknown;
    readonly density?: unknown;
    readonly runner?: unknown;
    readonly files: unknown;
  };
  return (
    candidate.tool === "ssealed" &&
    (candidate.version === undefined || typeof candidate.version === "string") &&
    typeof candidate.scope === "string" &&
    normalizeScope(candidate.scope) !== undefined &&
    (candidate.profile === undefined || isProfile(candidate.profile)) &&
    (candidate.addons === undefined || (Array.isArray(candidate.addons) && candidate.addons.every((addon) => isAddon(addon)))) &&
    (candidate.density === undefined || isDensity(candidate.density)) &&
    isRunner(candidate.runner) &&
    Array.isArray(candidate.files) &&
    candidate.files.every((file) => isManifestFileLike(file))
  );
}

function isManifestFileLike(value: unknown): value is {
  readonly path: string;
  readonly checksum: string;
  readonly acceptedChecksum?: string;
  readonly generatedChecksum?: string;
  readonly initialChecksum?: string;
  readonly kind: FileKind;
  readonly ownership?: FileOwnership;
  readonly presence?: FilePresence;
  readonly status?: ManifestFileStatus;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "checksum" in value &&
    "kind" in value &&
    typeof (value as { readonly path: unknown }).path === "string" &&
    typeof (value as { readonly checksum: unknown }).checksum === "string" &&
    ((value as { readonly acceptedChecksum?: unknown }).acceptedChecksum === undefined ||
      typeof (value as { readonly acceptedChecksum?: unknown }).acceptedChecksum === "string") &&
    ((value as { readonly generatedChecksum?: unknown }).generatedChecksum === undefined ||
      typeof (value as { readonly generatedChecksum?: unknown }).generatedChecksum === "string") &&
    ((value as { readonly initialChecksum?: unknown }).initialChecksum === undefined ||
      typeof (value as { readonly initialChecksum?: unknown }).initialChecksum === "string") &&
    isFileKind((value as { readonly kind: unknown }).kind) &&
    ((value as { readonly ownership?: unknown }).ownership === undefined || isFileOwnership((value as { readonly ownership?: unknown }).ownership)) &&
    ((value as { readonly presence?: unknown }).presence === undefined || isFilePresence((value as { readonly presence?: unknown }).presence)) &&
    ((value as { readonly status?: unknown }).status === undefined || isManifestFileStatus((value as { readonly status?: unknown }).status))
  );
}

function isDensity(value: unknown): value is Density {
  return value === "minimal" || value === "standard" || value === "strict";
}

function isRunner(value: unknown): value is Runner {
  return value === "none" || value === "make" || value === "just" || value === "task" || value === "npm" || value === "pnpm";
}

function isFileKind(value: unknown): value is FileKind {
  return (
    value === "document" ||
    value === "contract" ||
    value === "agent" ||
    value === "checklist" ||
    value === "validation" ||
    value === "diagram" ||
    value === "github" ||
    value === "runner" ||
    value === "manifest" ||
    value === "hygiene"
  );
}

function isFileOwnership(value: unknown): value is FileOwnership {
  return value === "seeded" || value === "managed" || value === "block-managed" || value === "project-owned";
}

function isFilePresence(value: unknown): value is FilePresence {
  return value === "required" || value === "optional";
}

function isManifestFileStatus(value: unknown): value is ManifestFileStatus {
  return value === "active" || value === "retired";
}

function normalizeFileOwnership(value: FileOwnership | undefined, pathValue: string): FileOwnership {
  if (value !== undefined) {
    return value;
  }
  return pathValue === ".gitignore" || pathValue === "package.json" ? "block-managed" : "seeded";
}

function normalizeFilePresence(value: FilePresence | undefined, ownership: FileOwnership | undefined, pathValue: string): FilePresence {
  if (value !== undefined) {
    return value;
  }
  const normalizedOwnership = normalizeFileOwnership(ownership, pathValue);
  return normalizedOwnership === "seeded" || normalizedOwnership === "project-owned" ? "optional" : "required";
}

function normalizeManifestFileStatus(value: ManifestFileStatus | undefined): ManifestFileStatus {
  return value ?? "active";
}

function planManifestSettingsConflict(
  command: ScaffoldCommand,
  previous: PreviousManifestSettings | undefined,
  current: PreviousManifestSettings & { readonly manifestContent: string },
): PlannedFile | undefined {
  if (previous === undefined) {
    return undefined;
  }
  if (command === "init") {
    return {
      path: ".ssealed/manifest.json",
      kind: "manifest",
      action: "conflict",
      content: normalizeText(current.manifestContent),
      reason: "Existing scaffold already has a valid .ssealed/manifest.json. Use ssealed update to reapply it or ssealed upgrade to change scaffold settings.",
    };
  }
  const changed = [
    previous.scope === current.scope ? undefined : `scope ${previous.scope} -> ${current.scope}`,
    previous.profile === current.profile ? undefined : `profile ${previous.profile} -> ${current.profile}`,
    sameAddons(previous.addons, current.addons) ? undefined : `addons ${formatAddons(previous.addons)} -> ${formatAddons(current.addons)}`,
    previous.density === current.density ? undefined : `density ${previous.density} -> ${current.density}`,
    previous.runner === current.runner ? undefined : `runner ${previous.runner} -> ${current.runner}`,
  ].filter((value): value is string => value !== undefined);

  if (changed.length === 0 || command === "upgrade") {
    return undefined;
  }

  return {
    path: ".ssealed/manifest.json",
    kind: "manifest",
    action: "conflict",
    content: normalizeText(current.manifestContent),
    reason: `Existing scaffold was initialized with different settings (${changed.join(", ")}). update does not migrate scope, profile, addons, density, or runner; use ssealed upgrade for an explicit transition.`,
  };
}

function normalizeManifestAddons(value: readonly Addon[] | undefined): readonly Addon[] {
  return normalizeAddons(value ?? []);
}

function normalizeManifestScope(value: string): Scope {
  const scope = normalizeScope(value);
  if (scope === undefined) {
    throw new Error(`Invalid manifest scope: ${value}`);
  }
  return scope;
}

function sameAddons(left: readonly Addon[], right: readonly Addon[]): boolean {
  return left.length === right.length && left.every((addon, index) => addon === right[index]);
}

function formatAddons(addons: readonly Addon[]): string {
  return addons.length === 0 ? "none" : addons.join("+");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export async function executeScaffold(
  options: InitOptions & {
    readonly lock?: "auto" | "none";
    readonly previousManifest?: PreviousManifestState;
  },
): Promise<ScaffoldResult> {
  const command = options.command ?? "init";
  const profile = options.profile ?? "generic";
  const addons = normalizeAddons(options.addons ?? []);
  const density = options.density ?? "standard";
  if (options.lock !== "none") {
    const targetRoot = path.resolve(options.target);
    if (options.dryRun) {
      return withScaffoldReadLock(targetRoot, () => executeScaffold({ ...options, lock: "none" }));
    }
    return withScaffoldWriteLock(targetRoot, options.breakStaleLock ?? false, () => executeScaffold({ ...options, lock: "none" }));
  }

  if (options.dryRun) {
    const plan = await planScaffoldWithWarnings(options, options.previousManifest);
    const conflicts = plan.files.filter((file) => file.action === "conflict");
    return {
      target: path.resolve(options.target),
      command,
      scope: options.scope,
      profile,
      addons,
      density,
      runner: options.runner,
      dryRun: options.dryRun,
      force: options.force,
      files: plan.files,
      conflicts,
      warnings: plan.warnings,
      written: [],
    };
  }

  const plan = await planScaffoldWithWarnings(options, options.previousManifest);
  const conflicts = plan.files.filter((file) => file.action === "conflict");
  if (conflicts.length > 0) {
    return {
      target: path.resolve(options.target),
      command,
      scope: options.scope,
      profile,
      addons,
      density,
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
    command,
    scope: options.scope,
    profile,
    addons,
    density,
    runner: options.runner,
    dryRun: false,
    force: options.force,
    files: plan.files,
    conflicts,
    warnings: plan.warnings,
    written,
  };
}

export async function withScaffoldReadLock<T>(targetRoot: string, task: () => Promise<T>): Promise<T> {
  const lockPath = resolveInsideTarget(targetRoot, ".ssealed-init.lock");
  await assertNoSymlinkInPath(targetRoot, lockPath);
  await assertNoActiveScaffoldWriteLock(lockPath);
  return task();
}

export async function withScaffoldWriteLock<T>(targetRoot: string, breakStaleLock: boolean, task: () => Promise<T>): Promise<T> {
  await ensureDirectoryInsideTarget(targetRoot, targetRoot);
  const lockPath = resolveInsideTarget(targetRoot, ".ssealed-init.lock");
  await assertNoSymlinkInPath(targetRoot, lockPath);
  return withScaffoldSignalHandling(() => acquireScaffoldLock(lockPath, breakStaleLock, task));
}

async function acquireScaffoldLock<T>(lockPath: string, breakStaleLock: boolean, task: () => Promise<T>): Promise<T> {
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
          hostname: hostname(),
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
    await handle.close();
    handle = undefined;
    getScaffoldInterruptContext()?.throwIfInterrupted();
    return await task();
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      if (breakStaleLock && (await removeStaleScaffoldLock(lockPath))) {
        return acquireScaffoldLock(lockPath, false, task);
      }
      throw new SsealedError(
        "LOCK_EXISTS",
        breakStaleLock
          ? "Existing scaffold lock is not stale. Refusing to remove .ssealed-init.lock while another ssealed command may still be running."
          : "Another ssealed init is already running for this target. Run again with --break-stale-lock only after confirming the lock is stale.",
      );
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

async function assertNoActiveScaffoldWriteLock(lockPath: string): Promise<void> {
  const lockStat = await stat(lockPath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (lockStat !== undefined) {
    throw new SsealedError("LOCK_EXISTS", "Another ssealed write command is already running for this target. Try again after it finishes.");
  }
}

async function removeStaleScaffoldLock(lockPath: string): Promise<boolean> {
  const metadata = await readScaffoldLockMetadata(lockPath);
  if (!isStaleScaffoldLock(metadata)) {
    return false;
  }
  await rm(lockPath, { force: true });
  return true;
}

interface ScaffoldLockMetadata {
  readonly pid?: number;
  readonly hostname?: string;
  readonly createdAt?: string;
}

async function readScaffoldLockMetadata(lockPath: string): Promise<ScaffoldLockMetadata | undefined> {
  const content = await readFile(lockPath, "utf8").catch(() => undefined);
  if (content === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }
    const metadata: { pid?: number; hostname?: string; createdAt?: string } = {};
    if (typeof (parsed as { readonly pid?: unknown }).pid === "number") {
      metadata.pid = (parsed as { readonly pid: number }).pid;
    }
    if (typeof (parsed as { readonly hostname?: unknown }).hostname === "string") {
      metadata.hostname = (parsed as { readonly hostname: string }).hostname;
    }
    if (typeof (parsed as { readonly createdAt?: unknown }).createdAt === "string") {
      metadata.createdAt = (parsed as { readonly createdAt: string }).createdAt;
    }
    return metadata;
  } catch {
    return undefined;
  }
}

function isStaleScaffoldLock(metadata: ScaffoldLockMetadata | undefined): boolean {
  if (metadata?.createdAt === undefined) {
    return false;
  }
  const createdAtMs = Date.parse(metadata.createdAt);
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs < staleLockAgeMs) {
    return false;
  }
  return !isLockProcessAlive(metadata);
}

function isLockProcessAlive(metadata: ScaffoldLockMetadata): boolean {
  if (metadata.hostname !== undefined && metadata.hostname !== hostname()) {
    return false;
  }
  if (metadata.pid === undefined || !Number.isInteger(metadata.pid) || metadata.pid <= 0) {
    return false;
  }
  try {
    process.kill(metadata.pid, 0);
    return true;
  } catch (error: unknown) {
    return isNodeError(error) && error.code === "EPERM";
  }
}
