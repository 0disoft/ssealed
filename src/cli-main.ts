import { parseArgs } from "node:util";
import { runScaffoldCommand, type CliCommand } from "./commands/init.js";
import { ScaffoldCleanupError, isScaffoldInterruptedError, isSsealedError } from "./core/errors.js";
import { toolVersion } from "./core/manifest.js";
import { addons, densities, profiles, runners, scopes } from "./core/types.js";

const commandNames = ["init", "adopt", "update", "upgrade", "doctor", "eject"] as const satisfies readonly CliCommand[];

const helpText = `ssealed

Usage:
  ssealed init [target] --scope backend|frontend|fullstack|general|mobile|infra|data [--repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--addon cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed adopt [target] --scope backend|frontend|fullstack|general|mobile|infra|data [--repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--addon cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed update [target]
  ssealed upgrade [target] [--scope backend|frontend|fullstack|general|mobile|infra|data] [--repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo] [--addon cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo | --clear-addons] [--density minimal|standard|strict] [--runner none|make|just|task|npm|pnpm]
  ssealed doctor [target] [--strict]
  ssealed eject runner [target] [--dry-run]
  ssealed --help
  ssealed --version

Omit [target] or pass . to use the current directory. Empty target strings are rejected.

Options:
  --scope      Scaffold ownership scope.
  --repo-type  Primary repository shape. Defaults to generic for init.
  --profile    Alias for --repo-type.
  --addon      Add an extra repository-shape surface. Repeatable.
  --clear-addons  Remove all addons during upgrade.
  --density    Scaffold density. Defaults to standard for init.
  --runner     Optional validation runner entrypoint. Defaults to none for init.
  --yes        Never prompt.
  --dry-run    Print planned operations without writing files.
  --force      Overwrite conflicts only when current content matches previous generated checksums.
  --break-stale-lock
               Remove an old scaffold lock after verifying it is stale.
  --strict     Make doctor fail on any accepted-checksum drift.
  --json       Print machine-readable JSON without interactive prompts.
`;

const optionHelp = {
  scope: `Scaffold ownership scope: ${scopes.join("|")}.`,
  "repo-type": `Primary repository shape: ${profiles.join("|")}. Defaults to generic for init/adopt.`,
  profile: "Alias for --repo-type.",
  addon: `Extra repository shape: ${addons.join("|")}. Repeatable.`,
  "clear-addons": "Remove all addons during upgrade; cannot be combined with --addon.",
  density: `Scaffold density: ${densities.join("|")}. Defaults to standard for init/adopt.`,
  runner: `Validation runner: ${runners.join("|")}. Defaults to none for init/adopt.`,
  yes: "Never prompt.",
  "dry-run": "Print planned operations without writing scaffold files.",
  force: "Overwrite only when current content matches previous generated checksums.",
  "break-stale-lock": "Recover an old scaffold lock after verifying it is stale.",
  strict: "Fail on any accepted-checksum drift.",
  json: "Print machine-readable JSON without interactive prompts.",
  help: "Show this command's help.",
} as const;

type OptionName = keyof typeof optionHelp;
const scaffoldOptions = ["scope", "repo-type", "profile", "addon", "density", "runner", "yes", "dry-run", "force", "break-stale-lock", "json", "help"] as const;
const allowedByCommand: Readonly<Record<CliCommand, readonly OptionName[]>> = {
  init: scaffoldOptions,
  adopt: scaffoldOptions,
  update: ["yes", "dry-run", "force", "break-stale-lock", "json", "help"],
  upgrade: [...scaffoldOptions, "clear-addons"],
  doctor: ["strict", "json", "help"],
  eject: ["dry-run", "break-stale-lock", "json", "help"],
};

const commandDetails: Readonly<Record<CliCommand, { readonly usage: string; readonly description: string; readonly example: string }>> = {
  init: {
    usage: "init [target] --scope <scope>",
    description: "Create a new scaffold. Refuses targets with an existing valid manifest.",
    example: "init ./my-service --scope backend --runner none",
  },
  adopt: {
    usage: "adopt [target] --scope <scope>",
    description: "Add scaffold metadata to an existing repository without taking over differing project files.",
    example: "adopt ./existing-repo --scope general --repo-type library --density minimal",
  },
  update: {
    usage: "update [target]",
    description: "Reapply manifest settings. To change scope, repo type, addons, density, or runner, use upgrade.",
    example: "update ./my-service --dry-run --json",
  },
  upgrade: {
    usage: "upgrade [target]",
    description: "Explicitly change scaffold settings. Untouched generated files needing replacement require --force; user edits are preserved.",
    example: "upgrade ./my-service --repo-type api-service --density strict --force",
  },
  doctor: {
    usage: "doctor [target]",
    description: "Check scaffold lifecycle metadata. Use --strict to require accepted checksums.",
    example: "doctor ./my-service --strict --json",
  },
  eject: {
    usage: "eject runner [target]",
    description: "Mark the managed runner surface as explicitly project-owned.",
    example: "eject runner ./my-service --dry-run",
  },
};

function commandHelpText(command: CliCommand): string {
  const details = commandDetails[command];
  const options = allowedByCommand[command].map((name) => `  --${name}  ${optionHelp[name]}`).join("\n");
  return `ssealed ${command}\n\n${details.description}\n\nUsage:\n  ssealed ${details.usage} [options]\n\nTarget defaults to the current directory. Empty target strings are rejected; pass . explicitly if needed.\n\nOptions:\n${options}\n\nExample:\n  ssealed ${details.example}\n`;
}

interface ParsedScaffoldArgs {
  readonly values: {
    readonly scope?: string;
    readonly profile?: string;
    readonly "repo-type"?: string;
    readonly addon?: string | readonly string[];
    readonly "clear-addons"?: boolean;
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
    process.stderr.write(`ssealed: ${parsed.message}\n`);
    return 1;
  }

  if (parsed.values.help) {
    process.stdout.write(commandHelpText(command));
    return 0;
  }

  const unsupportedOption = findUnsupportedOption(command, parsed.values);
  if (unsupportedOption !== undefined) {
    const message = `${command} does not support --${unsupportedOption}.`;
    if (parsed.values.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: { code: "UNSUPPORTED_OPTION", message } }, null, 2)}\n`);
      return 1;
    }
    process.stderr.write(`ssealed: ${message}\n`);
    return 1;
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
      ...(parsed.values["clear-addons"] === undefined ? {} : { clearAddons: parsed.values["clear-addons"] }),
      ...(parsed.values.density === undefined ? {} : { density: parsed.values.density }),
    });
  } catch (error: unknown) {
    const interrupted = isScaffoldInterruptedError(error);
    if (parsed.values.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: classifyRuntimeError(error) }, null, 2)}\n`);
      return interrupted ? error.exitCode : 1;
    }
    if (interrupted) {
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
        "clear-addons": { type: "boolean" },
        density: { type: "string" },
        runner: { type: "string" },
        yes: { type: "boolean" },
        "dry-run": { type: "boolean" },
        force: { type: "boolean" },
        "break-stale-lock": { type: "boolean" },
        strict: { type: "boolean" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }) as ParsedScaffoldArgs;
  } catch (error: unknown) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function findUnsupportedOption(command: CliCommand, values: ParsedScaffoldArgs["values"]): string | undefined {
  const allowed = new Set<string>(allowedByCommand[command]);
  return Object.entries(values).find(([name, value]) => value !== undefined && !allowed.has(name))?.[0];
}

function isCliCommand(value: string): value is CliCommand {
  return commandNames.includes(value as CliCommand);
}

function wantsJson(argv: readonly string[]): boolean {
  for (const arg of argv) {
    if (arg === "--") break;
    if (arg === "--json") return true;
  }
  return false;
}

interface RuntimeError {
  readonly code: string;
  readonly message: string;
  readonly signal?: string;
  readonly exitCode?: number;
  readonly committed?: boolean;
  readonly causes?: readonly RuntimeError[];
}

function classifyRuntimeError(error: unknown, ancestors = new Set<unknown>()): RuntimeError {
  if (ancestors.has(error)) return { code: "WRITE_FAILED", message: "Circular error cause omitted." };
  const nextAncestors = new Set(ancestors).add(error);
  const causes = error instanceof AggregateError
    ? { causes: error.errors.map((cause: unknown) => classifyRuntimeError(cause, nextAncestors)) }
    : {};
  const message = error instanceof Error ? error.message : String(error);
  if (isScaffoldInterruptedError(error)) {
    return { code: error.code, message, signal: error.signal, exitCode: error.exitCode, committed: error.committed };
  }
  if (error instanceof ScaffoldCleanupError) {
    return { code: "WRITE_FAILED", message, committed: error.committed, ...causes };
  }
  if (isSsealedError(error)) {
    return { code: error.code, message };
  }
  if (isNodeError(error)) {
    return { code: "FILESYSTEM_ERROR", message };
  }
  return { code: "WRITE_FAILED", message, ...causes };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
