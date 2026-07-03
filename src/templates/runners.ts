import type { Runner, TemplateFile } from "../core/types.js";

const validations = ["format", "lint", "typecheck", "test", "contract", "migration-check", "smoke", "docs", "check"] as const;

export function runnerFiles(runner: Runner): readonly TemplateFile[] {
  if (runner === "none") {
    return [];
  }
  if (runner === "make") {
    return [{ path: "Makefile", kind: "runner", content: makefile() }];
  }
  if (runner === "just") {
    return [{ path: "justfile", kind: "runner", content: justfile() }];
  }
  if (runner === "task") {
    return [{ path: "Taskfile.yml", kind: "runner", content: taskfile() }];
  }
  return [{ path: "package.json", kind: "runner", content: packageJson(runner), merge: "package-json" }];
}

export function validationScripts(runner: "npm" | "pnpm"): Record<string, string> {
  const prefix = runner === "pnpm" ? "pnpm" : "npm";
  return Object.fromEntries(
    validations.map((name) => [
      name,
      `node -e "console.error('${name} is not configured. Configure this validation before relying on ${prefix} run ${name}.'); process.exit(1)"`,
    ]),
  );
}

function makefile(): string {
  return `${validations
    .map((name) => {
      const message = `${name} is not configured. Configure this validation before relying on it.`;
      return `${name}:\n\t@echo "${message}"\n\t@exit 1`;
    })
    .join("\n\n")}\n`;
}

function justfile(): string {
  return `${validations
    .map((name) => {
      const message = `${name} is not configured. Configure this validation before relying on it.`;
      return `${name}:\n  @echo "${message}"\n  @exit 1`;
    })
    .join("\n\n")}\n`;
}

function taskfile(): string {
  return `version: '3'

tasks:
${validations
  .map(
    (name) => `  ${name}:
    cmds:
      - echo "${name} is not configured. Configure this validation before relying on it."
      - exit 1`,
  )
  .join("\n")}
`;
}

function packageJson(runner: "npm" | "pnpm"): string {
  return `${JSON.stringify({ scripts: validationScripts(runner) }, null, 2)}\n`;
}
