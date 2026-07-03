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
  if (isInitError(scope)) {
    return writeInitError(options, scope);
  }

  const runner = resolveRunner(options.runner);
  if (isInitError(runner)) {
    return writeInitError(options, runner);
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
    output.write(`${JSON.stringify(formatJsonResult(result), null, 2)}\n`);
  } else {
    output.write(formatHumanResult(result));
  }

  return result.conflicts.length > 0 ? 1 : 0;
}

type InitErrorCode = "INVALID_SCOPE" | "INVALID_RUNNER" | "MISSING_SCOPE";

interface InitError {
  readonly code: InitErrorCode;
  readonly message: string;
  readonly showExamples?: boolean;
}

async function resolveScope(options: InitCliOptions): Promise<Scope | InitError> {
  if (options.scope !== undefined) {
    if (isScope(options.scope)) {
      return options.scope;
    }
    return { code: "INVALID_SCOPE", message: `Invalid scope: ${options.scope}. Valid scopes: ${scopes.join(", ")}` };
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
    if (isScope(answer)) {
      return answer;
    }
    return { code: "INVALID_SCOPE", message: `Invalid scope: ${answer}` };
  } finally {
    rl.close();
  }
}

function resolveRunner(value: string | undefined): Runner | InitError {
  if (value === undefined) {
    return "none";
  }
  return isRunner(value)
    ? value
    : { code: "INVALID_RUNNER", message: `Invalid runner: ${value}. Valid runners: ${runners.join(", ")}` };
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

function isInitError(value: Scope | Runner | InitError): value is InitError {
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
    target: result.target,
    scope: result.scope,
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
    `ssealed init ${result.dryRun ? "plan" : "result"}`,
    `Target: ${result.target}`,
    `Scope: ${result.scope}`,
    `Runner: ${result.runner}`,
  ];

  for (const file of result.files) {
    lines.push(`- ${file.action}: ${file.path}${file.reason ? ` (${file.reason})` : ""}`);
  }

  for (const warning of result.warnings) {
    lines.push(`Warning ${warning.code} ${warning.path}: ${warning.message}`);
  }

  if (result.conflicts.length > 0) {
    lines.push("Conflicts detected. Re-run with --force to overwrite scaffold-managed files.");
  }

  return `${lines.join("\n")}\n`;
}
