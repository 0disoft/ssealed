import { parseArgs } from "node:util";
import { runScaffoldCommand, type CliCommand } from "./commands/init.js";
import { toolVersion } from "./core/manifest.js";

const commandNames = ["init", "update", "upgrade", "doctor"] as const satisfies readonly CliCommand[];

const helpText = `ssealed

Usage:
  ssealed init [target] --scope backend|frontend|fullstack|design [--profile generic|cli-tool|api-service|desktop-app|library] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed update [target]
  ssealed upgrade [target] [--scope backend|frontend|fullstack|design] [--profile generic|cli-tool|api-service|desktop-app|library] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed doctor [target]
  ssealed --help
  ssealed --version

Options:
  --scope    Scaffold ownership scope.
  --profile  Repository shape profile. Defaults to generic for init.
  --density  Scaffold density. Defaults to standard for init.
  --runner   Optional validation runner entrypoint. Defaults to none for init.
  --yes      Never prompt.
  --dry-run  Print planned operations without writing files.
  --force    Overwrite conflicts only when current content matches previous manifest checksums.
  --json     Print machine-readable JSON.
`;

const commandHelpText = `ssealed init|update|upgrade|doctor [target]

Commands:
  init     Create a new scaffold. Refuses targets with an existing valid manifest.
  update   Reapply the existing manifest settings without changing scope, profile, density, or runner.
  upgrade  Explicitly change scaffold settings and replan generated files.
  doctor   Check manifest-tracked files for missing or modified content.

Scopes:
  backend
  frontend
  fullstack
  design

Profiles:
  generic
  cli-tool
  api-service
  desktop-app
  library

Densities:
  minimal
  standard
  strict

Runners:
  none
  make
  just
  task
  npm
  pnpm

Examples:
  ssealed init --scope backend --runner none
  ssealed init --scope frontend --profile generic --density minimal --runner just
  ssealed update ./my-service --yes
  ssealed upgrade ./my-service --profile api-service --density strict --runner make --yes --force
  ssealed doctor ./my-service --json
`;

interface ParsedScaffoldArgs {
  readonly values: {
    readonly scope?: string;
    readonly profile?: string;
    readonly density?: string;
    readonly runner?: string;
    readonly yes?: boolean;
    readonly "dry-run"?: boolean;
    readonly force?: boolean;
    readonly json?: boolean;
    readonly help?: boolean;
  };
  readonly positionals: readonly string[];
}

export async function main(argv: readonly string[]): Promise<number> {
  const command = argv[0];
  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(helpText);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${toolVersion}\n`);
    return 0;
  }
  if (!isCliCommand(command)) {
    if (wantsJson(argv)) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, error: { code: "UNKNOWN_COMMAND", message: `Unknown command: ${command}` } }, null, 2)}\n`,
      );
      return 1;
    }
    process.stderr.write(`ssealed: unknown command ${command}\n`);
    process.stdout.write(helpText);
    return 1;
  }

  const parsed = parseScaffoldArgs(argv.slice(1));
  if (parsed instanceof Error) {
    if (wantsJson(argv)) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, error: { code: "INVALID_ARGUMENT", message: parsed.message } }, null, 2)}\n`,
      );
      return 1;
    }
    throw parsed;
  }

  if (parsed.values.help) {
    process.stdout.write(commandHelpText);
    return 0;
  }

  if (parsed.positionals.length > 1) {
    if (parsed.values.json) {
      process.stdout.write(
        `${JSON.stringify(
          { ok: false, error: { code: "TOO_MANY_TARGETS", message: `${command} accepts at most one target, got ${parsed.positionals.length}` } },
          null,
          2,
        )}\n`,
      );
      return 1;
    }
    process.stderr.write(`ssealed: ${command} accepts at most one target, got ${parsed.positionals.length}\n`);
    return 1;
  }

  try {
    return await runScaffoldCommand({
      command,
      target: parsed.positionals[0],
      scope: parsed.values.scope,
      runner: parsed.values.runner,
      yes: parsed.values.yes ?? false,
      dryRun: parsed.values["dry-run"] ?? false,
      force: parsed.values.force ?? false,
      json: parsed.values.json ?? false,
      ...(parsed.values.profile === undefined ? {} : { profile: parsed.values.profile }),
      ...(parsed.values.density === undefined ? {} : { density: parsed.values.density }),
    });
  } catch (error: unknown) {
    if (parsed.values.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: classifyRuntimeError(error) }, null, 2)}\n`);
      return 1;
    }
    throw error;
  }
}

function parseScaffoldArgs(args: readonly string[]): ParsedScaffoldArgs | Error {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      options: {
        scope: { type: "string" },
        profile: { type: "string" },
        density: { type: "string" },
        runner: { type: "string" },
        yes: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        force: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }) as ParsedScaffoldArgs;
  } catch (error: unknown) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function isCliCommand(value: string): value is CliCommand {
  return commandNames.includes(value as CliCommand);
}

function wantsJson(argv: readonly string[]): boolean {
  return argv.includes("--json");
}

function classifyRuntimeError(error: unknown): { readonly code: string; readonly message: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (/already running|init\.lock/u.test(message)) {
    return { code: "LOCK_EXISTS", message };
  }
  if (/symlink|escapes target|unsafe segment|unsafe path|not a regular file|null byte/u.test(message)) {
    return { code: "PATH_SAFETY_ERROR", message };
  }
  if (isNodeError(error)) {
    return { code: "FILESYSTEM_ERROR", message };
  }
  return { code: "WRITE_FAILED", message };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
