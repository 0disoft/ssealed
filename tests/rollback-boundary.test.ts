import { lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writePlannedFiles } from "../src/core/file-writer.js";

const hooks = vi.hoisted(() => ({
  target: undefined as string | undefined,
  afterRead: undefined as (() => Promise<void>) | undefined,
  moved: false,
  externalStages: 0,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const content = await actual.readFile(...args);
      if (String(args[0]) === hooks.target && String(content) === "GENERATED\n") await hooks.afterRead?.();
      return content;
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      if (hooks.moved && hooks.target !== undefined && path.dirname(String(args[0])) === path.dirname(hooks.target)) hooks.externalStages += 1;
      return handle;
    },
  };
});

let workdirs: string[] = [];
function resetHooks(): void {
  hooks.target = undefined; hooks.afterRead = undefined; hooks.moved = false; hooks.externalStages = 0;
}
beforeEach(() => { workdirs = []; resetHooks(); });
afterEach(async () => { resetHooks(); await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true }))); });
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-rollback-boundary-")); workdirs.push(dir); return dir;
}

describe("rollback target boundary", () => {
  it.each(["deletion", "restoration staging", "restoration publication"] as const)("preserves relocated files when the parent becomes a link before %s", async (phase) => {
    const dir = await tempDir();
    const external = await tempDir();
    const parent = path.join(dir, "generated");
    const relocated = path.join(external, "relocated");
    const target = path.join(parent, "note.md");
    const overwrite = phase !== "deletion";
    if (overwrite) {
      await mkdir(parent);
      await writeFile(target, "ORIGINAL\n");
    }
    hooks.target = target;
    let reads = 0;
    hooks.afterRead = async () => {
      reads += 1;
      if (reads !== (phase === "restoration publication" ? 2 : 1)) return;
      hooks.afterRead = undefined;
      await rename(parent, relocated);
      await symlink(relocated, parent, process.platform === "win32" ? "junction" : "dir");
      hooks.moved = true;
    };
    const failure = new Error("injected manifest publication failure");
    let observed: unknown;
    try {
      await writePlannedFiles(dir, [
        { path: "generated/note.md", kind: "document", action: overwrite ? "overwrite" : "create", content: "GENERATED\n", ...(overwrite ? { existingContent: "ORIGINAL\n" } : {}) },
        { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
      ], { beforeCommit: async (relativePath) => { if (relativePath === ".ssealed/manifest.json") throw failure; } });
    } catch (error) { observed = error; }
    expect(hooks.moved).toBe(true);
    await expect(readFile(path.join(relocated, "note.md"), "utf8")).resolves.toBe("GENERATED\n");
    expect(hooks.externalStages).toBe(0);
    expect(observed).toMatchObject({ errors: expect.arrayContaining([failure, expect.objectContaining({ code: "PATH_SAFETY_ERROR" })]) });
    expect(String(observed)).toMatch(/recovery was incomplete.*symlinked directory/iu);
    expect((await lstat(parent)).isSymbolicLink()).toBe(true);
    await expect(lstat(path.join(dir, ".ssealed"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
