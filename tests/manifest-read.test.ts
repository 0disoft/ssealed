import { lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { readPreviousManifest } from "../src/core/scaffold.js";

const hooks = vi.hoisted(() => ({
  target: undefined as string | undefined,
  beforeRead: undefined as (() => Promise<void>) | undefined,
  afterRead: undefined as (() => Promise<void>) | undefined,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const targeted = String(args[0]) === hooks.target;
      if (targeted) {
        const callback = hooks.beforeRead; hooks.beforeRead = undefined;
        await callback?.();
      }
      const content = await actual.readFile(...args);
      if (targeted) {
        const callback = hooks.afterRead; hooks.afterRead = undefined;
        await callback?.();
      }
      return content;
    },
  };
});

const manifest = JSON.stringify({ tool: "ssealed", scope: "general", runner: "none", files: [] });
let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.target = undefined; hooks.beforeRead = undefined; hooks.afterRead = undefined; });
afterEach(async () => {
  hooks.target = undefined; hooks.beforeRead = undefined; hooks.afterRead = undefined; vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-manifest-read-")); workdirs.push(dir); return dir;
}
async function setup(): Promise<{ root: string; target: string }> {
  const root = await tempDir();
  const target = path.join(root, ".ssealed", "manifest.json");
  await mkdir(path.dirname(target)); await writeFile(target, manifest);
  hooks.target = target;
  return { root, target };
}

describe("manifest read consistency", () => {
  it.each([["update"], ["upgrade"], ["eject", "runner"]])("rejects a manifest that grows beyond 1 MiB after preflight before %j writes", async (...args) => {
    const { root, target } = await setup();
    const expanded = `${manifest}${" ".repeat(1024 * 1024)}`;
    let changed = false;
    hooks.beforeRead = async () => { await writeFile(target, expanded); changed = true; };
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await main([...args, root, "--json"])).toBe(1);
    expect(changed).toBe(true);
    expect(JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""))).toMatchObject({ ok: false, error: { code: "INVALID_MANIFEST", message: expect.stringContaining("1 MiB") } });
    await expect(readFile(target, "utf8")).resolves.toBe(expanded);
    await expect(lstat(path.join(root, "AGENTS.md"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(path.join(root, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("accepts a stable manifest exactly at the supported byte limit", async () => {
    const { root, target } = await setup();
    await writeFile(target, `${manifest}${" ".repeat(1024 * 1024 - Buffer.byteLength(manifest))}`);
    expect(await readPreviousManifest(root)).toMatchObject({ settings: { scope: "general", runner: "none" }, warnings: [] });
  });

  it.each(["replacement", "in-place edit"] as const)("rejects a manifest changed during reading (%s)", async (change) => {
    const { root, target } = await setup();
    const preserved = change === "replacement" ? manifest : manifest.replace("general", "backend");
    let changed = false;
    hooks.afterRead = async () => {
      if (change === "replacement") await rename(target, `${target}.held`);
      await writeFile(target, preserved);
      if (change === "in-place edit") await utimes(target, new Date("2000-01-01T00:00:00.000Z"), new Date("2000-01-01T00:00:00.000Z"));
      changed = true;
    };
    const previous = await readPreviousManifest(root);
    expect(changed).toBe(true);
    expect(previous).toMatchObject({ settings: undefined, warnings: [{ code: "INVALID_MANIFEST", message: expect.stringContaining("changed while being read") }] });
    expect(previous.files.size).toBe(0);
    await expect(readFile(target, "utf8")).resolves.toBe(preserved);
  });

  it("reports a manifest removed after preflight as changed instead of treating the scaffold as new", async () => {
    const { root, target } = await setup();
    let changed = false;
    hooks.beforeRead = async () => { await rm(target); changed = true; };
    const previous = await readPreviousManifest(root);
    expect(changed).toBe(true);
    expect(previous).toMatchObject({ settings: undefined, warnings: [{ code: "INVALID_MANIFEST", message: expect.stringContaining("changed while being read") }] });
    expect(previous.files.size).toBe(0);
    await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a manifest whose parent becomes a link while its bytes are being read", async () => {
    const { root, target } = await setup();
    const outside = await tempDir();
    const parent = path.dirname(target); const relocated = path.join(outside, "relocated");
    let changed = false;
    hooks.afterRead = async () => { await rename(parent, relocated); await symlink(relocated, parent, process.platform === "win32" ? "junction" : "dir"); changed = true; };
    await expect(readPreviousManifest(root)).rejects.toMatchObject({ code: "PATH_SAFETY_ERROR" });
    expect(changed).toBe(true);
    await expect(readFile(path.join(relocated, "manifest.json"), "utf8")).resolves.toBe(manifest);
    expect((await lstat(parent)).isSymbolicLink()).toBe(true);
  });
});
