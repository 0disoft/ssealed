import { copyFile, mkdtemp, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writePlannedFiles, writeTextFileAtomically } from "../src/core/file-writer.js";
import { executeScaffold } from "../src/core/scaffold.js";
import { main } from "../src/cli-main.js";

const { temporaryId } = vi.hoisted(() => ({ temporaryId: "00000000-0000-4000-8000-000000000000" }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: () => temporaryId };
});

let workdirs: string[] = [];
beforeEach(() => {
  workdirs = [];
});
afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-atomic-"));
  workdirs.push(dir);
  return dir;
}

describe("atomic temporary-file ownership", () => {
  it("preserves an existing temporary file when exclusive creation fails", async () => {
    const dir = await tempDir();
    const target = path.join(dir, "target.txt");
    const temporary = path.join(dir, `.target.txt.${process.pid}.${temporaryId}.tmp`);
    await writeFile(target, "ORIGINAL\n");
    await writeFile(temporary, "PREEXISTING_TEMPORARY\n");

    await expect(writeTextFileAtomically(target, "GENERATED\n")).rejects.toMatchObject({ code: "EEXIST" });
    await expect(readFile(temporary, "utf8")).resolves.toBe("PREEXISTING_TEMPORARY\n");
    await expect(readFile(target, "utf8")).resolves.toBe("ORIGINAL\n");
  });

  it("cleans up its own staged file after failure and allows a retry", async () => {
    const dir = await tempDir();
    const target = path.join(dir, "target.txt");
    await writeFile(target, "ORIGINAL\n");
    const failure = new Error("injected publication failure");

    await expect(writeTextFileAtomically(target, "GENERATED\n", {
      beforeCommit: async () => { throw failure; },
    })).rejects.toBe(failure);
    await expect(readFile(target, "utf8")).resolves.toBe("ORIGINAL\n");
    expect(await readdir(dir)).toEqual(["target.txt"]);
    await writeTextFileAtomically(target, "GENERATED\n");
    await expect(readFile(target, "utf8")).resolves.toBe("GENERATED\n");
    expect(await readdir(dir)).toEqual(["target.txt"]);
  });

  it("closes and removes its partially written file when writing fails", async () => {
    const dir = await tempDir();
    const target = path.join(dir, "target.txt");
    await writeFile(target, "ORIGINAL\n");
    const probePath = path.join(dir, "probe.txt");
    const probe = await open(probePath, "wx");
    const prototype = Object.getPrototypeOf(probe) as Pick<typeof probe, "writeFile">;
    const originalWrite = prototype.writeFile;
    await probe.close();
    await rm(probePath);
    const failure = Object.assign(new Error("injected disk-full failure"), { code: "ENOSPC" });
    const write = vi.spyOn(prototype, "writeFile").mockImplementation(async function (this: typeof probe) {
      await originalWrite.call(this, "PARTIAL\n", "utf8");
      throw failure;
    });
    try {
      await expect(writeTextFileAtomically(target, "GENERATED\n")).rejects.toBe(failure);
    } finally {
      write.mockRestore();
    }
    await expect(readFile(target, "utf8")).resolves.toBe("ORIGINAL\n");
    expect(await readdir(dir)).toEqual(["target.txt"]);
  });

  it("restores the original bytes when the generated file is unchanged during rollback", async () => {
    const dir = await tempDir();
    const target = path.join(dir, "victim.txt");
    const original = "ORIGINAL\r\n";
    await writeFile(target, original);
    const failure = new Error("injected manifest publication failure");
    await expect(writePlannedFiles(dir, [
      { path: "victim.txt", kind: "document", action: "overwrite", content: "GENERATED\n", existingContent: original },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ], {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") throw failure;
      },
    })).rejects.toBe(failure);
    await expect(readFile(target, "utf8")).resolves.toBe(original);
    expect(await readdir(dir)).toEqual(["victim.txt"]);
  });

  it("retains every failed write in a batch and rolls back its successful writes", async () => {
    const dir = await tempDir();
    const firstFailure = new Error("injected first publication failure");
    const secondFailure = new Error("injected second publication failure");
    let failure: unknown;
    try {
      await writePlannedFiles(dir, [
        { path: "first.txt", kind: "document", action: "create", content: "FIRST\n" },
        { path: "second.txt", kind: "document", action: "create", content: "SECOND\n" },
        { path: "nested/success.txt", kind: "document", action: "create", content: "SUCCESS\n" },
      ], {
        beforeCommit: async (relativePath) => {
          if (relativePath === "first.txt") throw firstFailure;
          if (relativePath === "second.txt") throw secondFailure;
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([firstFailure, secondFailure]);
    expect(String(failure)).toContain("first.txt: injected first publication failure");
    expect(String(failure)).toContain("second.txt: injected second publication failure");
    expect(await readdir(dir)).toEqual([]);
  });

  it("preserves a user replacement made while rollback stages the original content", async () => {
    const dir = await tempDir();
    const target = path.join(dir, "victim.txt");
    await writeFile(target, "ORIGINAL\n");
    const probePath = path.join(dir, "probe.txt");
    const probe = await open(probePath, "wx");
    const prototype = Object.getPrototypeOf(probe) as Pick<typeof probe, "writeFile">;
    const originalWrite = prototype.writeFile;
    await probe.close();
    await rm(probePath);
    const write = vi.spyOn(prototype, "writeFile").mockImplementation(async function (
      this: typeof probe,
      ...args: Parameters<typeof probe.writeFile>
    ) {
      await originalWrite.apply(this, args);
      if (args[0] === "ORIGINAL\n") {
        await writeFile(target, "USER_REPLACEMENT\n");
      }
    });
    const manifestFailure = new Error("injected manifest publication failure");
    let failure: unknown;
    try {
      await writePlannedFiles(dir, [
        { path: "victim.txt", kind: "document", action: "overwrite", content: "GENERATED\n", existingContent: "ORIGINAL\n" },
        { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
      ], {
        beforeCommit: async (relativePath) => {
          if (relativePath === ".ssealed/manifest.json") {
            throw manifestFailure;
          }
        },
      });
    } catch (error) {
      failure = error;
    } finally {
      write.mockRestore();
    }
    await expect(readFile(target, "utf8")).resolves.toBe("USER_REPLACEMENT\n");
    expect(failure).toMatchObject({ errors: [manifestFailure, expect.objectContaining({ code: "WRITE_FAILED" })] });
    expect(String(failure)).toMatch(/recovery was incomplete.*victim\.txt.*changed/iu);
    expect(await readdir(dir)).toEqual(["victim.txt"]);
  });

  it("rejects a replaced manifest parent before publishing runner ejection", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "npm", dryRun: false, force: false });
    const metadata = path.join(dir, ".ssealed");
    const held = path.join(dir, "held-metadata");
    const external = await tempDir();
    const originalManifest = await readFile(path.join(metadata, "manifest.json"), "utf8");
    await writeFile(path.join(external, "manifest.json"), originalManifest);
    const probe = await open(path.join(dir, "probe.txt"), "wx");
    const prototype = Object.getPrototypeOf(probe) as Pick<typeof probe, "writeFile">;
    const originalWrite = prototype.writeFile;
    await probe.close();
    let replaced = false;
    const write = vi.spyOn(prototype, "writeFile").mockImplementation(async function (
      this: typeof probe,
      ...args: Parameters<typeof probe.writeFile>
    ) {
      await originalWrite.apply(this, args);
      if (typeof args[0] === "string" && args[0].includes('"ownership": "project-owned"')) {
        const originalClose = this.close;
        this.close = async () => {
          this.close = originalClose;
          await originalClose.call(this);
          await rename(metadata, held);
          replaced = true;
          await symlink(external, metadata, process.platform === "win32" ? "junction" : "dir");
          const temporaryName = `.manifest.json.${process.pid}.${temporaryId}.tmp`;
          await copyFile(path.join(held, temporaryName), path.join(external, temporaryName));
        };
      }
    });
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    let code: number;
    let payload: unknown;
    try {
      code = await main(["eject", "runner", dir, "--json"]);
      payload = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""));
    } finally {
      write.mockRestore();
      stdout.mockRestore();
      if (replaced) {
        await rm(metadata, { recursive: true });
        await rename(held, metadata);
      }
    }
    expect(payload, JSON.stringify(payload)).toMatchObject({ ok: false, error: { code: "PATH_SAFETY_ERROR" } });
    expect(code).toBe(1);
    await expect(readFile(path.join(external, "manifest.json"), "utf8")).resolves.toBe(originalManifest);
    await expect(readFile(path.join(metadata, "manifest.json"), "utf8")).resolves.toBe(originalManifest);
  });
});
