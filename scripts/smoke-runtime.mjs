import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const runtime = process.argv[2];
if (runtime !== "node" && runtime !== "bun") {
  throw new Error("Usage: node scripts/smoke-runtime.mjs node|bun");
}

const root = process.cwd();
const cliPath = path.join(root, "dist", "cli.js");
const target = await mkdtemp(path.join(tmpdir(), `ssealed-${runtime}-runtime-`));

async function runCli(args) {
  return execFileAsync(runtime, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
}

try {
  const version = await runCli(["--version"]);
  if (!/^\d+\.\d+\.\d+\s*$/.test(version.stdout)) {
    throw new Error(`${runtime} --version returned unexpected stdout: ${JSON.stringify(version.stdout)}`);
  }

  const result = await runCli(["init", target, "--scope", "design", "--runner", "none", "--yes", "--json"]);
  const payload = JSON.parse(result.stdout);
  const written = Array.isArray(payload.written) ? payload.written : [];
  const files = Array.isArray(payload.files) ? payload.files : [];
  const generatedBunfig = files.some((file) => file?.path === "bunfig.toml") || written.includes("bunfig.toml");
  if (
    payload.target !== target ||
    payload.scope !== "design" ||
    payload.runner !== "none" ||
    !written.includes("AGENTS.md") ||
    !written.includes(".ssealed/manifest.json") ||
    generatedBunfig
  ) {
    throw new Error(`${runtime} init returned unexpected JSON: ${result.stdout}`);
  }

  await readFile(path.join(target, ".ssealed", "manifest.json"), "utf8");
  console.log(`${runtime} runtime smoke passed`);
} finally {
  await rm(target, { recursive: true, force: true });
}
