import { mkdtemp, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeTextFileAtomically } from "../src/core/file-writer.js";

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
});
