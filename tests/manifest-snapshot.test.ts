import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { executeScaffold } from "../src/core/scaffold.js";

const hooks = vi.hoisted(() => ({
  target: undefined as string | undefined,
  reads: 0,
  cut: 2,
  beforeRead: undefined as (() => Promise<void>) | undefined,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (String(args[0]) === hooks.target && ++hooks.reads === hooks.cut) {
        const callback = hooks.beforeRead; hooks.beforeRead = undefined;
        await callback?.();
      }
      return actual.readFile(...args);
    },
  };
});

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.target = undefined; hooks.reads = 0; hooks.cut = 2; hooks.beforeRead = undefined; });
afterEach(async () => {
  hooks.target = undefined; hooks.beforeRead = undefined; vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-manifest-snapshot-")); workdirs.push(dir); return dir;
}
async function runJson(args: string[]): Promise<{ code: number; payload: Record<string, unknown> }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try { return { code: await main([...args, "--json"]), payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) }; }
  finally { stdout.mockRestore(); }
}
async function scaffold(): Promise<{ root: string; manifestPath: string; packagePath: string; manifest: string; pkg: string }> {
  const root = await tempDir();
  await executeScaffold({ target: root, scope: "general", runner: "npm", density: "minimal", dryRun: false, force: false });
  const manifestPath = path.join(root, ".ssealed", "manifest.json"); const packagePath = path.join(root, "package.json");
  return { root, manifestPath, packagePath, manifest: await readFile(manifestPath, "utf8"), pkg: await readFile(packagePath, "utf8") };
}

describe("validated manifest snapshot", () => {
  it.each(["future schema", "unsafe path", "oversized metadata", "changed settings"] as const)("preserves %s introduced after ejection validation", async (change) => {
    const setup = await scaffold();
    const next = JSON.parse(setup.manifest);
    if (change === "future schema") next.schemaVersion = 2;
    if (change === "unsafe path") next.files[0].path = "../outside.md";
    if (change === "oversized metadata") next.note = "x".repeat(1024 * 1024);
    if (change === "changed settings") next.runner = "none";
    const replacement = `${JSON.stringify(next, null, 2)}\n`;
    let changed = false;
    hooks.target = setup.manifestPath;
    hooks.beforeRead = async () => { await writeFile(setup.manifestPath, replacement); changed = true; };
    const result = await runJson(["eject", "runner", setup.root]);
    expect(changed).toBe(true);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "WRITE_FAILED", message: expect.stringContaining("manifest changed") } } });
    await expect(readFile(setup.manifestPath, "utf8")).resolves.toBe(replacement);
    await expect(readFile(setup.packagePath, "utf8")).resolves.toBe(setup.pkg);
    expect(await readdir(path.dirname(setup.manifestPath))).toEqual(["manifest.json"]);
    await expect(lstat(path.join(setup.root, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["update", "upgrade"])("refuses %s when manifest planning sees a different ownership snapshot", async (command) => {
    const setup = await scaffold();
    const replacement = `${JSON.stringify({ ...JSON.parse(setup.manifest), scope: "backend" }, null, 2)}\n`;
    let changed = false;
    hooks.target = setup.manifestPath;
    hooks.beforeRead = async () => { await writeFile(setup.manifestPath, replacement); changed = true; };
    const result = await runJson([command, setup.root, "--force"]);
    expect(changed).toBe(true);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, written: [], conflicts: [expect.objectContaining({ path: ".ssealed/manifest.json", reason: expect.stringContaining("Manifest changed") })] } });
    await expect(readFile(setup.manifestPath, "utf8")).resolves.toBe(replacement);
    await expect(readFile(setup.packagePath, "utf8")).resolves.toBe(setup.pkg);
    await expect(lstat(path.join(setup.root, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not let init replace a manifest that appeared while scaffold files were being planned", async () => {
    const root = await tempDir();
    const ignorePath = path.join(root, ".gitignore"); const manifestPath = path.join(root, ".ssealed", "manifest.json");
    const replacement = '{"tool":"ssealed","scope":"backend","runner":"none","files":[]}\n';
    await writeFile(ignorePath, "USER_PATTERN\n");
    let changed = false;
    hooks.target = ignorePath; hooks.cut = 1;
    hooks.beforeRead = async () => { await mkdir(path.dirname(manifestPath)); await writeFile(manifestPath, replacement); changed = true; };
    const result = await runJson(["init", root, "--scope", "general"]);
    expect(changed).toBe(true);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, written: [], conflicts: [expect.objectContaining({ path: ".ssealed/manifest.json", reason: expect.stringContaining("Manifest changed") })] } });
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(replacement);
    await expect(readFile(ignorePath, "utf8")).resolves.toBe("USER_PATTERN\n");
    await expect(lstat(path.join(root, "AGENTS.md"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(path.join(root, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
