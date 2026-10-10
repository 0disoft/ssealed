import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { withScaffoldWriteLock } from "../src/core/scaffold.js";

let workdirs: string[] = [];
beforeEach(() => {
  workdirs = [];
});

afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-json-"));
  workdirs.push(dir);
  return dir;
}

async function runJson(args: readonly string[]): Promise<{ code: number; payload: Record<string, unknown> }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    const code = await main([...args, "--json"]);
    return { code, payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) as Record<string, unknown> };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
}

describe("UTF-8 BOM compatibility", () => {
  it.each(["npm", "pnpm"] as const)("accepts and preserves a BOM package during %s runner merges", async (runner) => {
    const dir = await tempDir();
    const packagePath = path.join(dir, "package.json");
    await writeFile(packagePath, '\uFEFF{"name":"example","scripts":{"test":"custom-test"}}\n');
    expect((await runJson(["init", dir, "--scope", "general", "--runner", runner, "--yes"])).code).toBe(0);
    const content = await readFile(packagePath, "utf8");
    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(JSON.parse(content.slice(1))).toMatchObject({ name: "example", scripts: { test: "custom-test" } });
    expect((await runJson(["doctor", dir])).code).toBe(0);
    const updated = await runJson(["update", dir, "--yes"]);
    expect(updated.code).toBe(0);
    expect(updated.payload.written).not.toContain("package.json");
    await expect(readFile(packagePath, "utf8")).resolves.toBe(content);
  });

  it("accepts BOM manifests during doctor, update, upgrade, and eject", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const original = `\uFEFF${await readFile(manifestPath, "utf8")}`;
    await writeFile(manifestPath, original);
    expect((await runJson(["doctor", dir])).code).toBe(0);
    for (const flags of [["--dry-run"], []]) {
      expect((await runJson(["update", dir, "--yes", ...flags])).code).toBe(0);
      await expect(readFile(manifestPath, "utf8")).resolves.toBe(original);
    }
    expect((await runJson(["upgrade", dir, "--density", "minimal", "--yes"])).code).toBe(0);
    const upgraded = await readFile(manifestPath, "utf8");
    expect(upgraded.startsWith("\uFEFF")).toBe(true);
    expect((await runJson(["eject", "runner", dir, "--dry-run"])).code).toBe(0);
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(upgraded);
    expect((await runJson(["eject", "runner", dir])).code).toBe(0);
    expect((await readFile(manifestPath, "utf8")).startsWith("\uFEFF")).toBe(true);
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

  it("recognizes owned lock metadata with a BOM during cleanup", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    await expect(withScaffoldWriteLock(dir, false, async () => {
      await writeFile(lockPath, `\uFEFF${await readFile(lockPath, "utf8")}`);
      return "completed";
    })).resolves.toBe("completed");
    await expect(lstat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("still rejects malformed JSON after a BOM", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed"));
    await writeFile(path.join(dir, ".ssealed", "manifest.json"), "\uFEFF{bad json\n");
    expect(await runJson(["doctor", dir])).toMatchObject({
      code: 1, payload: { ok: false, error: { code: "INVALID_MANIFEST" } },
    });
  });
});

describe("manifest setting consistency", () => {
  it("rejects an addon that repeats the primary repository type before commands use it", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--repo-type", "library", "--yes"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { addons: string[] };
    manifest.addons = ["library"];
    const invalidContent = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(manifestPath, invalidContent);
    for (const args of [["doctor"], ["update"], ["upgrade"], ["update", "--dry-run"], ["upgrade", "--dry-run"]]) {
      expect(await runJson([...args, dir])).toMatchObject({
        code: 1, payload: { ok: false, error: { code: "INVALID_MANIFEST" } },
      });
      await expect(readFile(manifestPath, "utf8")).resolves.toBe(invalidContent);
    }
  });
});
