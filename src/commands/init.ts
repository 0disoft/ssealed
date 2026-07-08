import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { normalizeText, sha256 } from "../core/checksum.js";
import { executeScaffold, readPreviousManifest, withScaffoldReadLock, withScaffoldWriteLock, type PreviousManifestSettings, type PreviousManifestState } from "../core/scaffold.js";
import { assertNoSymlinkInPath, resolveInsideTarget } from "../core/path-safety.js";
import { gitignoreBlock } from "../templates/index.js";
import { validationScripts } from "../templates/runners.js";
import {
  addons,
  densities,
  isAddon,
  isProfile,
  normalizeAddons,
  normalizeScope,
  profiles,
  runners,
  scopes,
  type Addon,
  type Density,
  type Profile,
  type Runner,
  type ScaffoldCommand,
  type Scope,
} from "../core/types.js";

export type CliCommand = ScaffoldCommand | "doctor";

export interface InitCliOptions {
  readonly command?: CliCommand;
  readonly target: string | undefined;
  readonly scope: string | undefined;
  readonly profile?: string;
  readonly repoType?: string;
  readonly addon?: string | readonly string[];
  readonly density?: string;
  readonly runner: string | undefined;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly breakStaleLock?: boolean;
  readonly strict?: boolean;
  readonly json: boolean;
}

export async function runInit(options: InitCliOptions): Promise<number> {
  return runScaffoldCommand({ ...options, command: options.command ?? "init" });
}

export async function runScaffoldCommand(options: InitCliOptions & { readonly command: CliCommand }): Promise<number> {
  const target = path.resolve(options.target ?? process.cwd());
  if (options.command === "doctor") {
    return withScaffoldReadLock(target, () => runDoctor(target, options.json, options.strict ?? false));
  }
  const scaffoldCommand = options.command;

  const runResolvedScaffold = async (previousManifest?: PreviousManifestState): Promise<number> => {
    const settings = await resolveScaffoldSettings(target, { ...options, command: scaffoldCommand }, previousManifest);
    if (isInitError(settings)) {
      return writeInitError(options, settings);
    }

    const result = await executeScaffold({
      command: scaffoldCommand,
      target,
      scope: settings.scope,
      profile: settings.profile,
      addons: settings.addons,
      density: settings.density,
      runner: settings.runner,
      dryRun: options.dryRun,
      force: options.force,
      breakStaleLock: options.breakStaleLock ?? false,
      lock: previousManifest === undefined ? "auto" : "none",
      ...(previousManifest === undefined ? {} : { previousManifest }),
    });

    if (options.json) {
      output.write(`${JSON.stringify(formatJsonResult(result), null, 2)}\n`);
    } else {
      output.write(formatHumanResult(result));
    }

    return result.conflicts.length > 0 ? 1 : 0;
  };

  if (options.command === "init") {
    return runResolvedScaffold();
  }

  const runWithManifest = async (): Promise<number> => {
    const previousManifest = await readPreviousManifest(target);
    return runResolvedScaffold(previousManifest);
  };

  if (options.dryRun) {
    return withScaffoldReadLock(target, runWithManifest);
  }
  return withScaffoldWriteLock(target, options.breakStaleLock ?? false, runWithManifest);
}

type InitErrorCode =
  | "INVALID_SCOPE"
  | "INVALID_PROFILE"
  | "INVALID_ADDON"
  | "INVALID_DENSITY"
  | "INVALID_RUNNER"
  | "CONFLICTING_REPOSITORY_TYPE"
  | "MISSING_SCOPE"
  | "MISSING_MANIFEST"
  | "SETTINGS_CHANGE_REQUIRES_UPGRADE";

interface InitError {
  readonly code: InitErrorCode;
  readonly message: string;
  readonly showExamples?: boolean;
}

async function resolveScaffoldSettings(
  target: string,
  options: InitCliOptions & { readonly command: ScaffoldCommand },
  previousManifest?: PreviousManifestState,
): Promise<PreviousManifestSettings | InitError> {
  if (options.command === "init") {
    const scope = await resolveInitScope(options);
    if (isInitError(scope)) {
      return scope;
    }
    const repositoryShape = resolveRepositoryShape(options);
    if (isInitError(repositoryShape)) {
      return repositoryShape;
    }
    const density = resolveDensity(options.density);
    if (isInitError(density)) {
      return density;
    }
    const runner = resolveRunner(options.runner);
    if (isInitError(runner)) {
      return runner;
    }
    return {
      scope,
      profile: repositoryShape.profile,
      addons: repositoryShape.addons,
      density,
      runner,
    };
  }

  const previous = previousManifest ?? (await readPreviousManifest(target));
  if (previous.settings === undefined) {
    return {
      code: "MISSING_MANIFEST",
      message:
        previous.warnings.length > 0
          ? "Existing .ssealed/manifest.json is invalid. Repair or remove it before update or upgrade."
          : "Missing .ssealed/manifest.json. Use ssealed init to create a new scaffold first.",
    };
  }

  const scope = options.scope === undefined ? previous.settings.scope : resolveScopeValue(options.scope);
  if (isInitError(scope)) {
    return scope;
  }
  const repositoryShape = resolveRepositoryShape(options, previous.settings);
  if (isInitError(repositoryShape)) {
    return repositoryShape;
  }
  const density = options.density === undefined ? previous.settings.density : resolveDensity(options.density);
  if (isInitError(density)) {
    return density;
  }
  const runner = options.runner === undefined ? previous.settings.runner : resolveRunner(options.runner);
  if (isInitError(runner)) {
    return runner;
  }
  const resolved = { scope, profile: repositoryShape.profile, addons: repositoryShape.addons, density, runner };

  if (options.command === "update") {
    const changed = [
      resolved.scope === previous.settings.scope ? undefined : `scope ${previous.settings.scope} -> ${resolved.scope}`,
      resolved.profile === previous.settings.profile ? undefined : `profile ${previous.settings.profile} -> ${resolved.profile}`,
      sameAddons(resolved.addons, previous.settings.addons) ? undefined : `addons ${formatAddons(previous.settings.addons)} -> ${formatAddons(resolved.addons)}`,
      resolved.density === previous.settings.density ? undefined : `density ${previous.settings.density} -> ${resolved.density}`,
      resolved.runner === previous.settings.runner ? undefined : `runner ${previous.settings.runner} -> ${resolved.runner}`,
    ].filter((value): value is string => value !== undefined);

    if (changed.length > 0) {
      return {
        code: "SETTINGS_CHANGE_REQUIRES_UPGRADE",
        message: `update reuses existing scaffold settings. Use ssealed upgrade for setting changes (${changed.join(", ")}).`,
      };
    }
  }

  return resolved;
}

async function resolveInitScope(options: InitCliOptions): Promise<Scope | InitError> {
  if (options.scope !== undefined) {
    return resolveScopeValue(options.scope);
  }

  if (options.yes) {
    return {
      code: "MISSING_SCOPE",
      message: `Missing --scope. --yes disables prompts, so pass one of: ${scopes.join(", ")}.`,
      showExamples: true,
    };
  }

  if (!input.isTTY || !output.isTTY) {
    return { code: "MISSING_SCOPE", message: "Missing --scope in non-interactive mode.", showExamples: true };
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`Select scope (${scopes.join("/")}): `)).trim();
    return resolveScopeValue(answer);
  } finally {
    rl.close();
  }
}

function resolveScopeValue(value: string): Scope | InitError {
  const scope = normalizeScope(value);
  return scope !== undefined
    ? scope
    : { code: "INVALID_SCOPE", message: `Invalid scope: ${value}. Valid scopes: ${scopes.join(", ")}` };
}

function resolveRunner(value: string | undefined): Runner | InitError {
  if (value === undefined) {
    return "none";
  }
  return isRunner(value)
    ? value
    : { code: "INVALID_RUNNER", message: `Invalid runner: ${value}. Valid runners: ${runners.join(", ")}` };
}

interface RepositoryShape {
  readonly profile: Profile;
  readonly addons: readonly Addon[];
}

function resolveRepositoryShape(options: InitCliOptions, previous?: PreviousManifestSettings): RepositoryShape | InitError {
  const repoType = options.repoType;
  if (repoType !== undefined && options.profile !== undefined && repoType !== options.profile) {
    return {
      code: "CONFLICTING_REPOSITORY_TYPE",
      message: `Conflicting repository type options: --repo-type ${repoType} and --profile ${options.profile}. Use one value.`,
    };
  }

  const profileValue = repoType ?? options.profile;
  const profile = profileValue === undefined ? previous?.profile ?? "generic" : resolveProfile(profileValue);
  if (isInitError(profile)) {
    return profile;
  }

  const addonValues = options.addon === undefined ? previous?.addons ?? [] : toStringArray(options.addon);
  const parsedAddons: Addon[] = [];
  for (const value of addonValues) {
    if (value === "generic") {
      return { code: "INVALID_ADDON", message: "Invalid addon: generic. Addons must be repository-specific; valid addons: " + addons.join(", ") };
    }
    if (!isAddon(value)) {
      return { code: "INVALID_ADDON", message: `Invalid addon: ${value}. Valid addons: ${addons.join(", ")}` };
    }
    if (value === profile) {
      return { code: "INVALID_ADDON", message: `Invalid addon: ${value}. Addons must differ from the primary repository type.` };
    }
    parsedAddons.push(value);
  }

  return {
    profile,
    addons: normalizeAddons(parsedAddons),
  };
}

function toStringArray(value: string | readonly string[]): readonly string[] {
  return typeof value === "string" ? [value] : value;
}

function resolveProfile(value: string): Profile | InitError {
  return isProfile(value) ? value : { code: "INVALID_PROFILE", message: `Invalid repository type: ${value}. Valid repository types: ${profiles.join(", ")}` };
}

function resolveDensity(value: string | undefined): Density | InitError {
  if (value === undefined) {
    return "standard";
  }
  return isDensity(value)
    ? value
    : { code: "INVALID_DENSITY", message: `Invalid density: ${value}. Valid densities: ${densities.join(", ")}` };
}

function isDensity(value: string): value is Density {
  return densities.includes(value as Density);
}

function isRunner(value: string): value is Runner {
  return runners.includes(value as Runner);
}

function printError(message: string): void {
  process.stderr.write(`ssealed: ${message}\n`);
}

function printExamples(): void {
  process.stderr.write(
    [
      "Examples:",
      "  ssealed init --scope backend --runner none",
      "  ssealed init --scope frontend --repo-type generic --density minimal --runner just",
      "  ssealed update ./my-service --yes",
      "  ssealed upgrade ./my-service --repo-type api-service --density strict --runner make --yes --force",
      "  ssealed doctor ./my-service --json",
    ].join("\n") + "\n",
  );
}

function isInitError(value: unknown): value is InitError {
  return typeof value === "object" && value !== null && "code" in value;
}

function writeInitError(options: InitCliOptions, error: InitError): number {
  if (options.json) {
    output.write(`${JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }, null, 2)}\n`);
    return 1;
  }
  printError(error.message);
  if (error.showExamples) {
    printExamples();
  }
  return 1;
}

function formatJsonResult(result: Awaited<ReturnType<typeof executeScaffold>>): object {
  return {
    ok: result.conflicts.length === 0,
    command: result.command,
    target: result.target,
    scope: result.scope,
    profile: result.profile,
    repoType: result.profile,
    addons: result.addons,
    density: result.density,
    runner: result.runner,
    dryRun: result.dryRun,
    force: result.force,
    files: result.files.map(publicFile),
    conflicts: result.conflicts.map(publicFile),
    warnings: result.warnings,
    written: result.written,
  };
}

function publicFile(file: Awaited<ReturnType<typeof executeScaffold>>["files"][number]): object {
  return {
    path: file.path,
    kind: file.kind,
    action: file.action,
    ...(file.ownership === undefined ? {} : { ownership: file.ownership }),
    ...(file.presence === undefined ? {} : { presence: file.presence }),
    ...(file.manifestStatus === undefined ? {} : { status: file.manifestStatus }),
    ...(file.previouslyGenerated === undefined ? {} : { previouslyGenerated: file.previouslyGenerated }),
    ...(file.reason === undefined ? {} : { reason: file.reason }),
  };
}

function formatHumanResult(result: Awaited<ReturnType<typeof executeScaffold>>): string {
  const lines = [
    `ssealed ${result.command} ${result.dryRun ? "plan" : "result"}`,
    `Target: ${result.target}`,
    `Scope: ${result.scope}`,
    `Repository Type: ${result.profile}`,
    `Addons: ${formatAddons(result.addons)}`,
    `Density: ${result.density}`,
    `Runner: ${result.runner}`,
  ];

  for (const file of result.files) {
    lines.push(`- ${file.action}: ${file.path}${file.reason ? ` (${file.reason})` : ""}`);
  }

  for (const warning of result.warnings) {
    lines.push(`Warning ${warning.code} ${warning.path}: ${warning.message}`);
  }

  if (result.conflicts.length > 0) {
    lines.push("Conflicts detected. --force only overwrites files whose current content matches previous generated checksums.");
  }

  return `${lines.join("\n")}\n`;
}

interface DoctorCheck {
  readonly path: string;
  readonly kind: string;
  readonly ownership: string;
  readonly presence: string;
  readonly status:
    | "ok"
    | "customized"
    | "retired"
    | "missing"
    | "modified"
    | "block-modified"
    | "kind-mismatch"
    | "unreadable";
  readonly expectedChecksum: string;
  readonly actualChecksum?: string;
  readonly reason?: string | undefined;
}

async function runDoctor(target: string, json: boolean, strict: boolean): Promise<number> {
  const previous = await readPreviousManifest(target);
  if (previous.settings === undefined) {
    const payload = {
      ok: false,
      command: "doctor",
      target,
      warnings: previous.warnings,
      error:
        previous.warnings.length > 0
          ? {
              code: "INVALID_MANIFEST",
              message: "Existing .ssealed/manifest.json is invalid. Repair or remove it before running doctor.",
            }
          : {
              code: "MISSING_MANIFEST",
              message: "Missing .ssealed/manifest.json. Use ssealed init to create a new scaffold first.",
            },
    };
    if (json) {
      output.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      output.write(`ssealed doctor result\nTarget: ${target}\nStatus: ${payload.error.code}\n`);
      for (const warning of previous.warnings) {
        output.write(`Warning ${warning.code} ${warning.path}: ${warning.message}\n`);
      }
    }
    return 1;
  }
  const settings = previous.settings;

  const checks = await Promise.all(
    [...previous.files.entries()].map(async ([relativePath, file]): Promise<DoctorCheck> => {
      const absolutePath = resolveInsideTarget(target, relativePath);
      try {
        await assertNoSymlinkInPath(target, absolutePath);
        const stat = await lstat(absolutePath);
        if (!stat.isFile()) {
          return {
            path: relativePath,
            kind: file.kind,
            ownership: file.ownership,
            presence: file.presence,
            status: "kind-mismatch",
            expectedChecksum: file.checksum,
          };
        }
        const content = await readFile(absolutePath, "utf8");
        const actualChecksum = sha256(content);
        return checkExistingManifestFile({
          path: relativePath,
          kind: file.kind,
          ownership: file.ownership,
          presence: file.presence,
          manifestStatus: file.status,
          manifestVersion: previous.version,
          runner: settings.runner,
          strict,
          content,
          expectedChecksum: file.checksum,
          actualChecksum,
        });
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return {
            path: relativePath,
            kind: file.kind,
            ownership: file.ownership,
            presence: file.presence,
            status: file.status === "retired" || (!strict && file.presence === "optional") ? "retired" : "missing",
            expectedChecksum: file.checksum,
            reason:
              file.status === "retired"
                ? "Seeded file was previously accepted as retired."
                : !strict && file.presence === "optional"
                  ? "Optional seeded file is absent."
                  : undefined,
          };
        }
        return {
          path: relativePath,
          kind: file.kind,
          ownership: file.ownership,
          presence: file.presence,
          status: "unreadable",
          expectedChecksum: file.checksum,
        };
      }
    }),
  );

  const failed = checks.filter((check) => isFailedDoctorCheck(check));
  const payload = {
    ok: failed.length === 0,
    command: "doctor",
    strict,
    target,
    scope: settings.scope,
    profile: settings.profile,
    repoType: settings.profile,
    addons: settings.addons,
    density: settings.density,
    runner: settings.runner,
    checks,
    warnings: previous.warnings,
  };

  if (json) {
    output.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    output.write(formatDoctorHuman(payload));
  }

  return failed.length > 0 ? 1 : 0;
}

function formatDoctorHuman(payload: {
  readonly ok: boolean;
  readonly target: string;
  readonly scope: Scope;
  readonly profile: Profile;
  readonly addons: readonly Addon[];
  readonly density: Density;
  readonly runner: Runner;
  readonly strict: boolean;
  readonly checks: readonly DoctorCheck[];
}): string {
  const lines = [
    "ssealed doctor result",
    `Target: ${payload.target}`,
    `Scope: ${payload.scope}`,
    `Repository Type: ${payload.profile}`,
    `Addons: ${formatAddons(payload.addons)}`,
    `Density: ${payload.density}`,
    `Runner: ${payload.runner}`,
    `Mode: ${payload.strict ? "strict" : "lifecycle"}`,
    `Status: ${payload.ok ? "ok" : "drift"}`,
  ];

  for (const check of payload.checks) {
    lines.push(`- ${check.status}: ${check.path}${check.reason ? ` (${check.reason})` : ""}`);
  }
  return `${lines.join("\n")}\n`;
}

function checkExistingManifestFile(params: {
  readonly path: string;
  readonly kind: string;
  readonly ownership: string;
  readonly presence: string;
  readonly manifestStatus: string;
  readonly manifestVersion: string | undefined;
  readonly runner: Runner;
  readonly strict: boolean;
  readonly content: string;
  readonly expectedChecksum: string;
  readonly actualChecksum: string;
}): DoctorCheck {
  const base = {
    path: params.path,
    kind: params.kind,
    ownership: params.ownership,
    presence: params.presence,
    expectedChecksum: params.expectedChecksum,
    actualChecksum: params.actualChecksum,
  };

  if (params.actualChecksum === params.expectedChecksum) {
    return { ...base, status: "ok" };
  }

  if (params.strict) {
    return { ...base, status: "modified", reason: "Current content differs from the accepted manifest checksum." };
  }

  if (params.ownership === "seeded") {
    return {
      ...base,
      status: "customized",
      reason:
        params.manifestStatus === "retired"
          ? "Previously retired seeded file exists again as project-owned content."
          : "Seeded file has project-owned edits.",
    };
  }

  if (params.ownership === "block-managed") {
    const blockStatus = checkManagedBlock(params.path, params.content, params.runner, params.manifestVersion);
    if (blockStatus === undefined) {
      return { ...base, status: "block-modified", reason: "Managed block no longer matches the scaffold contract." };
    }
    return blockStatus ? { ...base, status: "ok" } : { ...base, status: "block-modified", reason: "Managed block no longer matches the scaffold contract." };
  }

  return { ...base, status: "modified", reason: "Managed file differs from the accepted manifest checksum." };
}

function checkManagedBlock(pathValue: string, content: string, runner: Runner, manifestVersion: string | undefined): boolean | undefined {
  if (pathValue === ".gitignore") {
    const blocks = extractManagedBlocks(content);
    return blocks.length === 1 && gitignoreBlocksAcceptedForManifest(manifestVersion).includes(normalizeText(blocks[0] ?? ""));
  }
  if (pathValue === "package.json") {
    const parsed = parseJsonObject(content);
    if (parsed === undefined || !isRecord(parsed.scripts)) {
      return false;
    }
    const scripts = parsed.scripts;
    const expectedScripts = validationScripts(runner === "pnpm" ? "pnpm" : "npm");
    return Object.entries(expectedScripts).every(([name, value]) => scripts[name] === value);
  }
  return undefined;
}

function gitignoreBlocksAcceptedForManifest(manifestVersion: string | undefined): readonly string[] {
  const currentBlock = normalizeText(gitignoreBlock());
  if (!isBeforeVersion(manifestVersion, "0.6.2")) {
    return [currentBlock];
  }
  return [currentBlock, normalizeText(gitignoreBlock().replace(".ssealed-init.lock\n", ""))];
}

function isBeforeVersion(value: string | undefined, minimum: string): boolean {
  if (value === undefined) {
    return true;
  }
  const parsed = parseVersion(value);
  const minimumParsed = parseVersion(minimum);
  if (parsed === undefined || minimumParsed === undefined) {
    return false;
  }
  for (let index = 0; index < minimumParsed.length; index += 1) {
    const left = parsed[index] ?? 0;
    const right = minimumParsed[index] ?? 0;
    if (left !== right) {
      return left < right;
    }
  }
  return false;
}

function parseVersion(value: string): readonly number[] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (match === null) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function extractManagedBlocks(content: string): readonly string[] {
  const normalized = normalizeText(content);
  const startMarker = "# >>> ssealed ignore patterns >>>";
  const endMarker = "# <<< ssealed ignore patterns <<<";
  const blocks: string[] = [];
  let offset = 0;

  while (offset < normalized.length) {
    const start = normalized.indexOf(startMarker, offset);
    if (start < 0) {
      break;
    }
    const end = normalized.indexOf(endMarker, start + startMarker.length);
    if (end < 0) {
      blocks.push(normalized.slice(start));
      break;
    }
    blocks.push(normalized.slice(start, end + endMarker.length));
    offset = end + endMarker.length;
  }

  return blocks;
}

function isFailedDoctorCheck(check: DoctorCheck): boolean {
  return check.status === "modified" || check.status === "block-modified" || check.status === "kind-mismatch" || check.status === "unreadable" || check.status === "missing";
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameAddons(left: readonly Addon[], right: readonly Addon[]): boolean {
  return left.length === right.length && left.every((addon, index) => addon === right[index]);
}

function formatAddons(values: readonly Addon[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
