import { lstat, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withScaffoldWriteLock } from "../src/core/scaffold.js";

const hooks = vi.hoisted(() => ({
  target: undefined as string | undefined,
  afterRead: undefined as ((content: Buffer) => Promise<void>) | undefined,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const content = await actual.readFile(...args);
      if (String(args[0]) === hooks.target && hooks.afterRead !== undefined) {
        const callback = hooks.afterRead;
        hooks.afterRead = undefined;
        await callback(typeof content === "string" ? Buffer.from(content) : content);
      }
      return content;
    },
  };
});

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.target = undefined; hooks.afterRead = undefined; });
afterEach(async () => {
  hooks.target = undefined; hooks.afterRead = undefined; vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-lock-ownership-")); workdirs.push(dir); return dir;
}

describe("lock ownership at removal", () => {
  it.each([
    ["release", "replacement"], ["release", "linked parent"],
    ["stale recovery", "replacement"], ["stale recovery", "linked parent"],
  ] as const)("preserves a lock changed during %s metadata reading (%s)", async (phase, change) => {
    const root = await tempDir();
    const external = await tempDir();
    const lockPath = path.join(root, ".ssealed-init.lock");
    const relocated = path.join(external, "relocated");
    const recovering = phase === "stale recovery";
    if (recovering) {
      await writeFile(lockPath, JSON.stringify({ tool: "ssealed", lockId: "stale", hostname: hostname(), pid: 99999999, createdAt: "2000-01-01T00:00:00.000Z" }));
      vi.spyOn(process, "kill").mockImplementation(() => { throw Object.assign(new Error("process is absent"), { code: "ESRCH" }); });
    }
    hooks.target = lockPath;
    let changed = false;
    let preservedContent: Buffer | undefined;
    hooks.afterRead = async (content) => {
      preservedContent = content;
      if (change === "replacement") {
        await rename(lockPath, `${lockPath}.held`);
        await writeFile(lockPath, content);
      } else {
        await rename(root, relocated);
        await symlink(relocated, root, process.platform === "win32" ? "junction" : "dir");
      }
      changed = true;
    };
    const task = vi.fn(async () => "completed");
    let observed: unknown;
    try { await withScaffoldWriteLock(root, recovering, task); }
    catch (error) { observed = error; }
    expect(changed).toBe(true);
    expect(observed).toBeInstanceOf(Error);
    expect(String(observed)).toMatch(change === "replacement" ? /ownership.*preserv/iu : /symlink/iu);
    expect(task).toHaveBeenCalledTimes(recovering ? 0 : 1);
    const preservedPath = change === "replacement" ? lockPath : path.join(relocated, ".ssealed-init.lock");
    await expect(readFile(preservedPath)).resolves.toEqual(preservedContent);
    if (change === "linked parent") expect((await lstat(root)).isSymbolicLink()).toBe(true);
    else await expect(lstat(path.join(root, ".ssealed-recovery.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
