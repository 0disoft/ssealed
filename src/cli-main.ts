import { parseArgs } from "node:util";
import { runInit } from "./commands/init.js";
import { toolVersion } from "./core/manifest.js";

const helpText = `ssealed

Usage:
  ssealed init [target] [--scope backend|frontend|fullstack|design] [--runner none|make|just|task|npm|pnpm]
  ssealed --help
  ssealed --version

Options:
  --scope    Scaffold ownership scope.
  --runner   Optional validation runner entrypoint. Defaults to none.
  --yes      Never prompt.
  --dry-run  Print planned operations without writing files.
  --force    Overwrite conflicting scaffold-managed files.
  --json     Print machine-readable JSON.
`;

const initHelpText = `ssealed init [target]

Scopes:
  backend
  frontend
  fullstack
  design

Runners:
  none
  make
  just
  task
  npm
  pnpm

Examples:
  ssealed init --scope backend --runner none
  ssealed init --scope frontend --runner just
  ssealed init ./my-service --scope backend --runner make --yes
  ssealed init --scope fullstack --runner pnpm
  ssealed init --scope design --dry-run
`;

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
  if (command !== "init") {
    process.stderr.write(`ssealed: unknown command ${command}\n`);
    process.stdout.write(helpText);
    return 1;
  }

  const parsed = parseArgs({
    args: argv.slice(1),
    allowPositionals: true,
    options: {
      scope: { type: "string" },
      runner: { type: "string" },
      yes: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (parsed.values.help) {
    process.stdout.write(initHelpText);
    return 0;
  }

  if (parsed.positionals.length > 1) {
    process.stderr.write(`ssealed: init accepts at most one target, got ${parsed.positionals.length}\n`);
    return 1;
  }

  return runInit({
    target: parsed.positionals[0],
    scope: parsed.values.scope,
    runner: parsed.values.runner,
    yes: parsed.values.yes ?? false,
    dryRun: parsed.values["dry-run"] ?? false,
    force: parsed.values.force ?? false,
    json: parsed.values.json ?? false,
  });
}
