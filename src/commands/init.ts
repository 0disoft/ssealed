import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { executeScaffold } from "../core/scaffold.js";
import { runners, scopes, type Runner, type Scope } from "../core/types.js";

export interface InitCliOptions {
  readonly target: string | undefined;
  readonly scope: string | undefined;
  readonly runner: string | undefined;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly json: boolean;
}

export async function runInit(options: InitCliOptions): Promise<number> {
  const scope = await resolveScope(options);
  if (scope === undefined) {
    return 1;
  }

  const runner = resolveRunner(options.runner);
  if (runner === undefined) {
    printError(`Invalid runner: ${options.runner ?? ""}. Valid runners: ${runners.join(", ")}`);
    return 1;
  }

  const target = path.resolve(options.target ?? process.cwd());
  const result = await executeScaffold({
    target,
    scope,
    runner,
    dryRun: options.dryRun,
    force: options.force,
  });

  if (options.json) {
    output.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    output.write(formatHumanResult(result));
  }

  return result.conflicts.length > 0 ? 1 : 0;
}

async function resolveScope(options: InitCliOptions): Promise<Scope | undefined> {
  if (options.scope !== undefined) {
    if (isScope(options.scope)) {
      return options.scope;
    }
    printError(`Invalid scope: ${options.scope}. Valid scopes: ${scopes.join(", ")}`);
    return undefined;
  }

  if (options.yes) {
    printError("Missing --scope. --yes disables prompts, so pass one of: backend, frontend, fullstack, design.");
    printExamples();
    return undefined;
  }

  if (!input.isTTY || !output.isTTY) {
    printError("Missing --scope in non-interactive mode.");
    printExamples();
    return undefined;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("Select scope (backend/frontend/fullstack/design): ")).trim();
    if (isScope(answer)) {
      return answer;
    }
    printError(`Invalid scope: ${answer}`);
    return undefined;
  } finally {
    rl.close();
  }
}

function resolveRunner(value: string | undefined): Runner | undefined {
  if (value === undefined) {
    return "none";
  }
  return isRunner(value) ? value : undefined;
}

function isScope(value: string): value is Scope {
  return scopes.includes(value as Scope);
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
      "  ssealed init --scope frontend --runner just",
      "  ssealed init ./my-service --scope backend --runner make --yes",
      "  ssealed init --scope fullstack --runner pnpm",
      "  ssealed init --scope design --dry-run",
    ].join("\n") + "\n",
  );
}

function formatHumanResult(result: Awaited<ReturnType<typeof executeScaffold>>): string {
  const lines = [
    `ssealed init ${result.dryRun ? "plan" : "result"}`,
    `Target: ${result.target}`,
    `Scope: ${result.scope}`,
    `Runner: ${result.runner}`,
  ];

  for (const file of result.files) {
    lines.push(`- ${file.action}: ${file.path}${file.reason ? ` (${file.reason})` : ""}`);
  }

  if (result.conflicts.length > 0) {
    lines.push("Conflicts detected. Re-run with --force to overwrite scaffold-managed files.");
  }

  return `${lines.join("\n")}\n`;
}
