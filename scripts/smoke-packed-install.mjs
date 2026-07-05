import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const temp = await mkdtemp(path.join(tmpdir(), "ssealed-packed-install-"));
const installRoot = path.join(temp, "consumer");
const target = path.join(temp, "target");
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

async function run(command, args, cwd = root, options = {}) {
  return execFileAsync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    ...options,
  });
}

async function runNpm(args, cwd = root) {
  if (process.platform === "win32") {
    return run(process.execPath, [npmCli, ...args], cwd);
  }
  return run("npm", args, cwd);
}

async function runBinShim(bin, args, cwd) {
  if (process.platform === "win32") {
    const commandLine = `"${[bin, ...args].map(quoteCmdArg).join(" ")}"`;
    return run("cmd.exe", ["/d", "/s", "/c", commandLine], cwd, { windowsVerbatimArguments: true });
  }
  return run(bin, args, cwd);
}

function quoteCmdArg(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

try {
  await mkdir(installRoot, { recursive: true });
  await writeFile(path.join(installRoot, "package.json"), '{\n  "private": true,\n  "type": "module"\n}\n', "utf8");

  const pack = await runNpm(["pack", "--json", "--pack-destination", temp]);
  const packed = JSON.parse(pack.stdout);
  const filename = packed?.[0]?.filename;
  if (typeof filename !== "string" || !filename.endsWith(".tgz")) {
    throw new Error(`npm pack returned unexpected output: ${pack.stdout}`);
  }

  const tarball = path.join(temp, filename);
  await runNpm(["install", tarball, "--ignore-scripts", "--no-audit", "--no-fund"], installRoot);

  const bin = path.join(installRoot, "node_modules", ".bin", process.platform === "win32" ? "ssealed.cmd" : "ssealed");
  const version = await runBinShim(bin, ["--version"], installRoot);
  if (!/^\d+\.\d+\.\d+\s*$/u.test(version.stdout)) {
    throw new Error(`installed ssealed --version returned unexpected stdout: ${JSON.stringify(version.stdout)}`);
  }

  const init = await runBinShim(bin, ["init", target, "--scope", "design", "--profile", "cli-tool", "--yes", "--json"], installRoot);
  const payload = JSON.parse(init.stdout);
  const written = Array.isArray(payload.written) ? payload.written : [];
  if (
    payload.ok !== true ||
    payload.command !== "init" ||
    payload.scope !== "design" ||
    payload.profile !== "cli-tool" ||
    payload.density !== "standard" ||
    !written.includes("docs/cli/command-contract.md") ||
    !written.includes(".ssealed/manifest.json")
  ) {
    throw new Error(`installed ssealed init returned unexpected JSON: ${init.stdout}`);
  }

  const manifest = JSON.parse(await readFile(path.join(target, ".ssealed", "manifest.json"), "utf8"));
  if (manifest.profile !== "cli-tool" || manifest.density !== "standard") {
    throw new Error(`installed ssealed wrote unexpected manifest settings: ${JSON.stringify({ profile: manifest.profile, density: manifest.density })}`);
  }

  console.log("packed install smoke passed");
} finally {
  await rm(temp, { recursive: true, force: true });
}
