import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { sha256 } from "../core/checksum.js";
import { executeScaffold, readPreviousManifest, type PreviousManifestSettings } from "../core/scaffold.js";
import { resolveInsideTarget } from "../core/path-safety.js";
import { densities, profiles, runners, scopes, type Density, type Profile, type Runner, type ScaffoldCommand, type Scope } from "../core/types.js";

export type CliCommand = ScaffoldCommand | "doctor";

export interface InitCliOptions {
  readonly command?: CliCommand;
  readonly target: string | undefined;
  readonly scope: string | undefined;
  readonly profile?: string;
  readonly density?: string;
  readonly runner: string | undefined;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly json: boolean;
}

export async function runInit(options: InitCliOptions): Promise<number> {
  return runScaffoldCommand({ ...options, command: options.command ?? "init" });
}

export async function runScaffoldCommand(options: InitCliOptions & { readonly command: CliCommand }): Promise<number> {
  const target = path.resolve(options.target ?? process.cwd());
  if (options.command === "doctor") {
    return runDoctor(target, options.json);
  }

  const settings = await resolveScaffoldSettings(target, { ...options, command: options.command });
  if (isInitError(settings)) {
    return writeInitError(options, settings);
  }

  const result = await executeScaffold({
    command: options.command,
    target,
    scope: settings.scope,
    profile: settings.profile,
    density: settings.density,
    runner: settings.runner,
    dryRun: options.dryRun,
    force: options.force,
  });

  if (options.json) {
    output.write(`${JSON.stringify(formatJsonResult(result), null, 2)}\n`);
  } else {
    output.write(formatHumanResult(result));
  }

  return result.conflicts.length > 0 ? 1 : 0;
}

type InitErrorCode =
  | "INVALID_SCOPE"
  | "INVALID_PROFILE"
  | "INVALID_DENSITY"
  | "INVALID_RUNNER"
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
): Promise<PreviousManifestSettings | InitError> {
  if (options.command === "init") {
    const scope = await resolveInitScope(options);
    if (isInitError(scope)) {
      return scope;
    }
    const profile = resolveProfile(options.profile);
    if (isInitError(profile)) {
      return profile;
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
      profile,
      density,
      runner,
    };
  }

  const previous = await readPreviousManifest(target);
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
  const profile = options.profile === undefined ? previous.settings.profile : resolveProfile(options.profile);
  if (isInitError(profile)) {
    return profile;
  }
  const density = options.density === undefined ? previous.settings.density : resolveDensity(options.density);
  if (isInitError(density)) {
    return density;
  }
  const runner = options.runner === undefined ? previous.settings.runner : resolveRunner(options.runner);
  if (isInitError(runner)) {
    return runner;
  }
  const resolved = { scope, profile, density, runner };

  if (options.command === "update") {
    const changed = [
      resolved.scope === previous.settings.scope ? undefined : `scope ${previous.settings.scope} -> ${resolved.scope}`,
      resolved.profile === previous.settings.profile ? undefined : `profile ${previous.settings.profile} -> ${resolved.profile}`,
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
      message: "Missing --scope. --yes disables prompts, so pass one of: backend, frontend, fullstack, design.",
      showExamples: true,
    };
  }

  if (!input.isTTY || !output.isTTY) {
    return { code: "MISSING_SCOPE", message: "Missing --scope in non-interactive mode.", showExamples: true };
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("Select scope (backend/frontend/fullstack/design): ")).trim();
    return resolveScopeValue(answer);
  } finally {
    rl.close();
  }
}

function resolveScopeValue(value: string): Scope | InitError {
  return isScope(value)
    ? value
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

function resolveProfile(value: string | undefined): Profile | InitError {
  if (value === undefined) {
    return "generic";
  }
  return isProfile(value)
    ? value
    : { code: "INVALID_PROFILE", message: `Invalid profile: ${value}. Valid profiles: ${profiles.join(", ")}` };
}

function resolveDensity(value: string | undefined): Density | InitError {
  if (value === undefined) {
    return "standard";
  }
  return isDensity(value)
    ? value
    : { code: "INVALID_DENSITY", message: `Invalid density: ${value}. Valid densities: ${densities.join(", ")}` };
}

function isScope(value: string): value is Scope {
  return scopes.includes(value as Scope);
}

function isProfile(value: string): value is Profile {
  return profiles.includes(value as Profile);
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
      "  ssealed init --scope frontend --profile generic --density minimal --runner just",
      "  ssealed update ./my-service --yes",
      "  ssealed upgrade ./my-service --profile api-service --density strict --runner make --yes --force",
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
    ...(file.previouslyGenerated === undefined ? {} : { previouslyGenerated: file.previouslyGenerated }),
    ...(file.reason === undefined ? {} : { reason: file.reason }),
  };
}

function formatHumanResult(result: Awaited<ReturnType<typeof executeScaffold>>): string {
  const lines = [
    `ssealed ${result.command} ${result.dryRun ? "plan" : "result"}`,
    `Target: ${result.target}`,
    `Scope: ${result.scope}`,
    `Profile: ${result.profile}`,
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
    lines.push("Conflicts detected. --force only overwrites files whose current content matches previous manifest checksums.");
  }

  return `${lines.join("\n")}\n`;
}

interface DoctorCheck {
  readonly path: string;
  readonly kind: string;
  readonly status: "ok" | "missing" | "modified" | "kind-mismatch" | "unreadable";
  readonly expectedChecksum: string;
  readonly actualChecksum?: string;
}

async function runDoctor(target: string, json: boolean): Promise<number> {
  const previous = await readPreviousManifest(target);
  if (previous.settings === undefined) {
    const payload = {
      ok: false,
      command: "doctor",
      target,
      warnings: previous.warnings,
      error: previous.warnings.length > 0 ? "INVALID_MANIFEST" : "MISSING_MANIFEST",
    };
    if (json) {
      output.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      output.write(`ssealed doctor result\nTarget: ${target}\nStatus: ${payload.error}\n`);
      for (const warning of previous.warnings) {
        output.write(`Warning ${warning.code} ${warning.path}: ${warning.message}\n`);
      }
    }
    return 1;
  }

  const checks = await Promise.all(
    [...previous.files.entries()].map(async ([relativePath, file]): Promise<DoctorCheck> => {
      const absolutePath = resolveInsideTarget(target, relativePath);
      try {
        const stat = await lstat(absolutePath);
        if (!stat.isFile()) {
          return { path: relativePath, kind: file.kind, status: "kind-mismatch", expectedChecksum: file.checksum };
        }
        const content = await readFile(absolutePath, "utf8");
        const actualChecksum = sha256(content);
        return {
          path: relativePath,
          kind: file.kind,
          status: actualChecksum === file.checksum ? "ok" : "modified",
          expectedChecksum: file.checksum,
          actualChecksum,
        };
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return { path: relativePath, kind: file.kind, status: "missing", expectedChecksum: file.checksum };
        }
        return { path: relativePath, kind: file.kind, status: "unreadable", expectedChecksum: file.checksum };
      }
    }),
  );

  const failed = checks.filter((check) => check.status !== "ok");
  const payload = {
    ok: failed.length === 0,
    command: "doctor",
    target,
    scope: previous.settings.scope,
    profile: previous.settings.profile,
    density: previous.settings.density,
    runner: previous.settings.runner,
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
  readonly density: Density;
  readonly runner: Runner;
  readonly checks: readonly DoctorCheck[];
}): string {
  const lines = [
    "ssealed doctor result",
    `Target: ${payload.target}`,
    `Scope: ${payload.scope}`,
    `Profile: ${payload.profile}`,
    `Density: ${payload.density}`,
    `Runner: ${payload.runner}`,
    `Status: ${payload.ok ? "ok" : "drift"}`,
  ];

  for (const check of payload.checks) {
    lines.push(`- ${check.status}: ${check.path}`);
  }
  return `${lines.join("\n")}\n`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
