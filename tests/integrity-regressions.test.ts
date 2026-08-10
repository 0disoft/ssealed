import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { gitignoreBlock } from "../src/templates/index.js";

let workdirs: string[] = [];

beforeEach(() => {
  workdirs = [];
});

afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-integrity-"));
  workdirs.push(dir);
  return dir;
}

async function runJson(args: readonly string[]): Promise<{ readonly code: number; readonly payload: Record<string, unknown> }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    const code = await main([...args, "--json"]);
    const output = stdout.mock.calls.map(([chunk]) => String(chunk)).join("");
    return { code, payload: JSON.parse(output) as Record<string, unknown> };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
}

describe("managed surface integrity", () => {
  it("does not let update accept a modified managed package script", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);

    const packagePath = path.join(dir, "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> };
    packageJson.scripts.lint = "echo USER_OWNED_LINT";
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

    expect((await runJson(["doctor", dir])).code).toBe(1);
    const update = await runJson(["update", dir, "--yes"]);
    expect(update.code).toBe(1);
    expect(update.payload.conflicts).toEqual([expect.objectContaining({ path: "package.json", action: "conflict" })]);
    expect((await runJson(["doctor", dir])).code).toBe(1);
  });

  it("does not let update accept duplicate gitignore managed blocks", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);

    const gitignorePath = path.join(dir, ".gitignore");
    await writeFile(gitignorePath, `${await readFile(gitignorePath, "utf8")}\n${gitignoreBlock()}`);

    expect((await runJson(["doctor", dir])).code).toBe(1);
    const update = await runJson(["update", dir, "--yes"]);
    expect(update.code).toBe(1);
    expect(update.payload.conflicts).toEqual([expect.objectContaining({ path: ".gitignore", action: "conflict" })]);
    expect((await runJson(["doctor", dir])).code).toBe(1);
  });

  it("keeps eject runner dry-run side-effect free", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);

    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const before = await readFile(manifestPath, "utf8");
    const eject = await runJson(["eject", "runner", dir, "--dry-run"]);

    expect(eject.code).toBe(0);
    expect(eject.payload).toEqual(expect.objectContaining({ ok: true, command: "eject", dryRun: true, status: "planned" }));
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(before);
  });

  it("rejects options that the selected command does not support", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);

    const doctor = await runJson(["doctor", dir, "--force"]);
    expect(doctor).toEqual({
      code: 1,
      payload: {
        ok: false,
        error: { code: "UNSUPPORTED_OPTION", message: "doctor does not support --force." },
      },
    });
  });
});
