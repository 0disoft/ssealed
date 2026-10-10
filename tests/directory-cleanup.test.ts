import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writePlannedFiles } from "../src/core/file-writer.js";

const hooks = vi.hoisted(() => ({ competingDirectory: undefined as string | undefined }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdir: async (...args: Parameters<typeof actual.mkdir>) => {
      if (String(args[0]) === hooks.competingDirectory) {
        hooks.competingDirectory = undefined;
        await actual.mkdir(args[0], { recursive: true });
      }
      return actual.mkdir(...args);
    },
  };
});

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.competingDirectory = undefined; });
afterEach(async () => {
  hooks.competingDirectory = undefined;
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-directory-cleanup-"));
  workdirs.push(dir);
  return dir;
}

describe("failed scaffold directory ownership", () => {
  it("preserves an empty replacement directory and reports incomplete recovery", async () => {
    const dir = await tempDir();
    const generated = path.join(dir, "generated", "deep");
    const held = path.join(dir, "held-generated");
    const failure = new Error("injected manifest publication failure");
    const operation = writePlannedFiles(dir, [
      { path: "generated/deep/note.md", kind: "document", action: "create", content: "SEED\n" },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ], {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") {
          await rename(generated, held);
          await mkdir(generated);
          throw failure;
        }
      },
    });
    await expect(operation).rejects.toMatchObject({ errors: [failure, expect.objectContaining({ message: expect.stringMatching(/directory.*ownership changed/iu) })] });
    expect((await lstat(generated)).isDirectory()).toBe(true);
    expect(await readdir(generated)).toEqual([]);
    await expect(readFile(path.join(held, "note.md"), "utf8")).resolves.toBe("SEED\n");
    await expect(lstat(path.join(dir, ".ssealed"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not claim a directory that another writer created before mkdir", async () => {
    const dir = await tempDir();
    const shared = path.join(dir, "shared");
    hooks.competingDirectory = shared;
    const failure = new Error("injected manifest publication failure");
    await expect(writePlannedFiles(dir, [
      { path: "shared/note.md", kind: "document", action: "create", content: "SEED\n" },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ], {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") throw failure;
      },
    })).rejects.toBe(failure);
    expect((await lstat(shared)).isDirectory()).toBe(true);
    expect(await readdir(shared)).toEqual([]);
    expect(await readdir(dir)).toEqual(["shared"]);
  });

  it("preserves external empty directories when a created parent becomes a link", async () => {
    const dir = await tempDir();
    const external = await tempDir();
    await mkdir(path.join(external, "deep"));
    const generated = path.join(dir, "generated");
    const held = path.join(dir, "held-generated");
    const failure = new Error("injected manifest publication failure");
    await expect(writePlannedFiles(dir, [
      { path: "generated/deep/note.md", kind: "document", action: "create", content: "SEED\n" },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ], {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") {
          await rename(generated, held);
          await symlink(external, generated, process.platform === "win32" ? "junction" : "dir");
          throw failure;
        }
      },
    })).rejects.toMatchObject({ errors: expect.arrayContaining([failure, expect.objectContaining({ code: "PATH_SAFETY_ERROR" })]) });
    expect(await readdir(external)).toEqual(["deep"]);
    expect(await readdir(path.join(external, "deep"))).toEqual([]);
    expect((await lstat(generated)).isSymbolicLink()).toBe(true);
    await expect(readFile(path.join(held, "deep", "note.md"), "utf8")).resolves.toBe("SEED\n");
    await expect(lstat(path.join(dir, ".ssealed"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes owned shared and nested directories while retaining pre-existing parents and the target", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, "pre-existing"));
    const failure = new Error("injected manifest publication failure");
    await expect(writePlannedFiles(dir, [
      { path: "generated/shared/deep/first.md", kind: "document", action: "create", content: "FIRST\n" },
      { path: "generated/shared/second.md", kind: "document", action: "create", content: "SECOND\n" },
      { path: "generated/third.md", kind: "document", action: "create", content: "THIRD\n" },
      { path: "pre-existing/child/fourth.md", kind: "document", action: "create", content: "FOURTH\n" },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ], {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") throw failure;
      },
    })).rejects.toBe(failure);
    expect(await readdir(dir)).toEqual(["pre-existing"]);
    expect(await readdir(path.join(dir, "pre-existing"))).toEqual([]);
  });
});
