import { parseArgs } from "node:util";
import { runScaffoldCommand, type CliCommand } from "./commands/init.js";
import { isScaffoldInterruptedError, isSsealedError } from "./core/errors.js";
import { toolVersion } from "./core/manifest.js";

const commandNames = ["init", "update", "upgrade", "doctor", "eject"] as const satisfies readonly CliCommand[];

const helpText = `ssealed

Usage:
  ssealed init [target] --scope backend|frontend|fullstack|general|mobile|infra|data [--repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--addon cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed update [target]
  ssealed upgrade [target] [--scope backend|frontend|fullstack|general|mobile|infra|data] [--repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--addon cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed doctor [target] [--strict]
  ssealed eject runner [target]
  ssealed --help
  ssealed --version

Options:
  --scope      Scaffold ownership scope.
  --repo-type  Primary repository shape. Defaults to generic for init.
  --profile    Alias for --repo-type.
  --addon      Add an extra repository-shape surface. Repeatable.
  --density    Scaffold density. Defaults to standard for init.
  --runner     Optional validation runner entrypoint. Defaults to none for init.
  --yes        Never prompt.
  --dry-run    Print planned operations without writing files.
  --force      Overwrite conflicts only when current content matches previous generated checksums.
  --break-stale-lock
               Remove an old scaffold lock after verifying it is stale.
  --strict     Make doctor fail on any accepted-checksum drift.
  --json       Print machine-readable JSON.
`;

const commandHelpText = `ssealed init|update|upgrade|doctor|eject [target]

Commands:
  init     Create a new scaffold. Refuses targets with an existing valid manifest.
  update   Reapply the existing manifest settings without changing scope, repo type, addons, density, or runner.
  upgrade  Explicitly change scaffold settings and replan generated files.
  doctor   Check scaffold lifecycle metadata. Use --strict to require accepted checksums.
  eject    Mark a managed scaffold surface as explicitly project-owned.

Scopes:
  backend
  frontend
  fullstack
  general
  mobile
  infra
  data

Repository Types:
  generic
  cli-tool
  api-service
  desktop-app
  library
  web-app
  mobile-app
  sdk
  worker-service
  infra-module
  data-pipeline
  github-action
  browser-extension
  plugin
  docs-site
  monorepo

Addons:
  Any repository type except generic. Repeat --addon for multiple surfaces.

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
  ssealed init --scope frontend --repo-type generic --density minimal --runner just
  ssealed init --scope general --repo-type cli-tool --addon github-action --dry-run
  ssealed update ./my-service --yes
  ssealed upgrade ./my-service --repo-type api-service --density strict --runner make --yes --force
  ssealed doctor ./my-service --json
  ssealed doctor ./my-service --strict
  ssealed eject runner ./my-service
`;

interface ParsedScaffoldArgs {
  readonly values: {
    readonly scope?: string;
    readonly profile?: string;
    readonly "repo-type"?: string;
    readonly addon?: string | readonly string[];
    readonly density?: string;
    readonly runner?: string;
    readonly yes?: boolean;
    readonly "dry-run"?: boolean;
    readonly force?: boolean;
    readonly "break-stale-lock"?: boolean;
    readonly strict?: boolean;
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

  const ejectSubject = command === "eject" ? parsed.positionals[0] : undefined;
  const targetPositionals = command === "eject" ? parsed.positionals.slice(1) : parsed.positionals;
  if (targetPositionals.length > 1 || (command === "eject" && parsed.positionals.length === 0)) {
    if (parsed.values.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            error:
              command === "eject" && parsed.positionals.length === 0
                ? { code: "INVALID_EJECT_TARGET", message: "Invalid eject target. Use: ssealed eject runner [target]" }
                : { code: "TOO_MANY_TARGETS", message: `${command} accepts at most one target, got ${targetPositionals.length}` },
          },
          null,
          2,
        )}\n`,
      );
      return 1;
    }
    process.stderr.write(
      command === "eject" && parsed.positionals.length === 0
        ? "ssealed: Invalid eject target. Use: ssealed eject runner [target]\n"
        : `ssealed: ${command} accepts at most one target, got ${targetPositionals.length}\n`,
    );
    return 1;
  }

  try {
    return await runScaffoldCommand({
      command,
      target: targetPositionals[0],
      scope: parsed.values.scope,
      runner: parsed.values.runner,
      yes: parsed.values.yes ?? false,
      dryRun: parsed.values["dry-run"] ?? false,
      force: parsed.values.force ?? false,
      breakStaleLock: parsed.values["break-stale-lock"] ?? false,
      strict: parsed.values.strict ?? false,
      json: parsed.values.json ?? false,
      ...(ejectSubject === undefined ? {} : { eject: ejectSubject }),
      ...(parsed.values["repo-type"] === undefined ? {} : { repoType: parsed.values["repo-type"] }),
      ...(parsed.values.profile === undefined ? {} : { profile: parsed.values.profile }),
      ...(parsed.values.addon === undefined ? {} : { addon: parsed.values.addon }),
      ...(parsed.values.density === undefined ? {} : { density: parsed.values.density }),
    });
  } catch (error: unknown) {
    if (parsed.values.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: classifyRuntimeError(error) }, null, 2)}\n`);
      return 1;
    }
    if (isScaffoldInterruptedError(error)) {
      process.stderr.write(`ssealed: ${error.message}\n`);
      return error.exitCode;
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
        "repo-type": { type: "string" },
        profile: { type: "string" },
        addon: { type: "string", multiple: true },
        density: { type: "string" },
        runner: { type: "string" },
        yes: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        force: { type: "boolean", default: false },
        "break-stale-lock": { type: "boolean", default: false },
        strict: { type: "boolean", default: false },
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
  if (isSsealedError(error)) {
    return { code: error.code, message };
  }
  if (isNodeError(error)) {
    return { code: "FILESYSTEM_ERROR", message };
  }
  return { code: "WRITE_FAILED", message };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
