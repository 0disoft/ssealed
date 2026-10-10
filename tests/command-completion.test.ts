import { lstat, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { executeScaffold } from "../src/core/scaffold.js";
import { writePlannedFiles } from "../src/core/file-writer.js";

const hooks = vi.hoisted(() => ({ beforeLockRemoval: undefined as (() => Promise<void>) | undefined }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rm: async (...args: Parameters<typeof actual.rm>) => {
      if (String(args[0]).endsWith(`${path.sep}.ssealed-init.lock`)) await hooks.beforeLockRemoval?.();
      return actual.rm(...args);
    },
  };
});

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.beforeLockRemoval = undefined; });
afterEach(async () => {
  hooks.beforeLockRemoval = undefined;
  vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-completion-"));
  workdirs.push(dir);
  return dir;
}

describe("command completion boundary", () => {
  it("rolls back interrupted partial writes without reporting them as committed", async () => {
    const dir = await tempDir();
    await expect(writePlannedFiles(dir, [
      { path: "nested/content.txt", kind: "document", action: "create", content: "GENERATED\n" },
    ], { beforeCommit: async () => { process.emit("SIGINT", "SIGINT"); } })).rejects.toMatchObject({ code: "INTERRUPTED", signal: "SIGINT", committed: false });
    expect(await readdir(dir)).toEqual([]);
  });

  it.each(["init", "update", "upgrade", "eject", "doctor"] as const)("reports one accurate JSON result when %s receives a signal during lock release", async (command) => {
    const dir = await tempDir();
    if (command !== "init") await executeScaffold({ target: dir, scope: "general", runner: "npm", dryRun: false, force: false });
    if (command === "update") await writeFile(path.join(dir, "README.md"), "# User README\n");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    let outputBeforeRelease = -1;
    hooks.beforeLockRemoval = async () => {
      outputBeforeRelease = stdout.mock.calls.length;
      process.emit("SIGTERM", "SIGTERM");
    };
    const args = command === "init" ? ["init", dir, "--scope", "general", "--runner", "npm"]
      : command === "upgrade" ? ["upgrade", dir, "--density", "minimal", "--force"]
        : command === "eject" ? ["eject", "runner", dir] : [command, dir];
    const flags = command === "doctor" || command === "eject" ? ["--json"] : ["--yes", "--json"];
    expect(await main([...args, ...flags])).toBe(143);
    const payload = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""));
    expect(outputBeforeRelease).toBe(0);
    expect(payload).toMatchObject({ ok: false, error: { code: "INTERRUPTED", signal: "SIGTERM", committed: command !== "doctor" } });
    expect(payload.error.message).not.toContain("rolled back");
    await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    if (command === "upgrade") expect(manifest.density).toBe("minimal");
    if (command === "eject") expect(manifest.files.find((file: { path: string }) => file.path === "package.json").ownership).toBe("project-owned");
  });

  it("reports only failure when committed update writes are followed by a lock cleanup failure", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await writeFile(path.join(dir, "README.md"), "# User README\n");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    hooks.beforeLockRemoval = async () => { throw Object.assign(new Error("injected lock removal failure"), { code: "EACCES" }); };
    expect(await main(["update", dir, "--yes", "--json"])).toBe(1);
    const payload = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""));
    expect(payload).toMatchObject({ ok: false, error: { committed: true, message: expect.stringContaining("lock removal failure") } });
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    expect(manifest.files.find((file: { path: string }) => file.path === "README.md").acceptedChecksum).toBeDefined();
    await expect(readFile(path.join(dir, "README.md"), "utf8")).resolves.toBe("# User README\n");
  });
});
