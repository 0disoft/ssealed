import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeScaffold, withScaffoldWriteLock } from "../src/core/scaffold.js";
import { main } from "../src/cli-main.js";

const hooks = vi.hoisted(() => ({ staleRead: undefined as (() => Promise<void>) | undefined }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const content = await actual.readFile(...args);
      if (String(args[0]).endsWith(`${path.sep}.ssealed-init.lock`) && String(content).includes('"lockId":"stale"')) await hooks.staleRead?.();
      return content;
    },
  };
});
let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.staleRead = undefined; });
afterEach(async () => { hooks.staleRead = undefined; vi.restoreAllMocks(); await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true }))); });
async function tempDir(): Promise<string> { const dir = await mkdtemp(path.join(tmpdir(), "ssealed-stale-")); workdirs.push(dir); return dir; }
function barrier(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
async function staleLock(dir: string): Promise<string> {
  const content = JSON.stringify({ tool: "ssealed", lockId: "stale", hostname: hostname(), pid: 99999999, createdAt: "2000-01-01T00:00:00.000Z" });
  await writeFile(path.join(dir, ".ssealed-init.lock"), content);
  vi.spyOn(process, "kill").mockImplementation(() => { throw Object.assign(new Error("process is absent"), { code: "ESRCH" }); });
  return content;
}

describe("serialized stale lock recovery", () => {
  it("keeps concurrent recovery callers out of the same write section", async () => {
    const dir = await tempDir();
    await staleLock(dir);
    const secondRead = barrier(); const firstEntered = barrier(); const secondEntered = barrier(); const anySettled = barrier();
    let reads = 0; let active = 0; let maximum = 0; let entries = 0;
    hooks.staleRead = async () => {
      reads += 1;
      if (reads === 1) await Promise.race([secondRead.promise, anySettled.promise]);
      else if (reads === 2) { secondRead.release(); await firstEntered.promise; }
    };
    const task = async (name: string): Promise<void> => {
      active += 1; maximum = Math.max(maximum, active); entries += 1;
      try {
        if (entries === 1) { firstEntered.release(); await Promise.race([secondEntered.promise, anySettled.promise]); }
        else secondEntered.release();
        await writeFile(path.join(dir, name), "written\n");
      } finally { active -= 1; }
    };
    const results = await Promise.allSettled([
      withScaffoldWriteLock(dir, true, () => task("a.txt")).finally(anySettled.release),
      withScaffoldWriteLock(dir, true, () => task("b.txt")).finally(anySettled.release),
    ]);
    expect(maximum).toBe(1);
    expect(entries).toBe(1);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(path.join(dir, ".ssealed-recovery.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves an existing recovery lock and explains manual recovery", async () => {
    const dir = await tempDir(); const original = await staleLock(dir);
    const recovery = path.join(dir, ".ssealed-recovery.lock");
    await writeFile(recovery, "incomplete recovery metadata\n");
    const task = vi.fn(async () => "unexpected task");
    await expect(withScaffoldWriteLock(dir, true, task)).rejects.toThrow(/recovery.*\.ssealed-recovery.lock/iu);
    expect(task).not.toHaveBeenCalled();
    await expect(readFile(recovery, "utf8")).resolves.toBe("incomplete recovery metadata\n");
    await expect(readFile(path.join(dir, ".ssealed-init.lock"), "utf8")).resolves.toBe(original);
  });

  it("reserves the recovery path and ignores both lock files in generated projects", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const ignore = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(ignore).toContain(".ssealed-init.lock\n.ssealed-recovery.lock\n");
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")); manifest.files[0].path = ".ssealed-recovery.lock";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await main(["doctor", dir, "--json"])).toBe(1);
    expect(JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""))).toMatchObject({ error: { code: "INVALID_MANIFEST" } });
  });

  it("accepts a pre-recovery ignore block only for an older manifest", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const ignorePath = path.join(dir, ".gitignore");
    await writeFile(ignorePath, (await readFile(ignorePath, "utf8")).replace(".ssealed-recovery.lock\n", ""));
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    for (const [version, code] of [["0.7.23", 0], ["0.7.24", 1]] as const) {
      await writeFile(manifestPath, `${JSON.stringify({ ...manifest, generatorVersion: version, version }, null, 2)}\n`);
      stdout.mockClear();
      expect(await main(["doctor", dir, "--json"])).toBe(code);
      const payload = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""));
      expect(payload.checks.find((check: { path: string }) => check.path === ".gitignore").status).toBe(code === 0 ? "ok" : "block-modified");
    }
  });
});
