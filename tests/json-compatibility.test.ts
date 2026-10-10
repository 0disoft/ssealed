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

describe("UTF-8 byte preservation", () => {
  it("preserves valid Unicode and literal replacement characters during merges", async () => {
    const dir = await tempDir();
    const pattern = "café-한글-\uFFFD.local\n";
    const description = "café 한글 \uFFFD";
    await writeFile(path.join(dir, ".gitignore"), pattern);
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "example", description }));
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm"])).code).toBe(0);
    expect(await readFile(path.join(dir, ".gitignore"), "utf8")).toContain(pattern);
    expect(JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"))).toMatchObject({ description });
    expect((await runJson(["doctor", dir, "--strict"])).code).toBe(0);
  });

  it.each([".gitignore", "package.json"])("reports invalid UTF-8 in an existing %s and leaves update side-effect free", async (file) => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = await readFile(manifestPath);
    const filePath = path.join(dir, file);
    const content = await readFile(filePath);
    const original = file === ".gitignore"
      ? Buffer.concat([Buffer.from("caf"), Buffer.from([0xe9]), Buffer.from(".local\n"), content])
      : Buffer.concat([Buffer.from('{"description":"caf'), Buffer.from([0xe9]), Buffer.from('",'), content.subarray(1)]);
    await writeFile(filePath, original);
    const doctor = await runJson(["doctor", dir]);
    expect(doctor.code).toBe(1);
    expect(doctor.payload.checks).toContainEqual(expect.objectContaining({ path: file, status: "unreadable", reason: expect.stringContaining("UTF-8") }));
    for (const flags of [["--dry-run"], []]) {
      const update = await runJson(["update", dir, "--force", ...flags]);
      expect(update.code).toBe(1);
      expect(update.payload.conflicts).toContainEqual(expect.objectContaining({ path: file, reason: expect.stringContaining("UTF-8") }));
      expect(update.payload.written).toEqual([]);
      expect(await readFile(filePath)).toEqual(original);
      expect(await readFile(manifestPath)).toEqual(manifest);
    }
  });

  it.each([".gitignore", "package.json"].flatMap((file) => [false, true].map((force) => ({ file, force }))))(
    "refuses to merge invalid UTF-8 in $file with force=$force",
    async ({ file, force }) => {
      const dir = await tempDir();
      const filePath = path.join(dir, file);
      const original = Buffer.concat(file === ".gitignore"
        ? [Buffer.from("# existing patterns\ncaf"), Buffer.from([0xe9]), Buffer.from(".local\n")]
        : [Buffer.from('{"name":"caf'), Buffer.from([0xe9]), Buffer.from('","scripts":{"start":"node app.js"}}\n')]);
      await writeFile(filePath, original);
      for (const dryRun of [true, false]) {
        const result = await runJson(["init", dir, "--scope", "general", "--runner", "npm", ...(force ? ["--force"] : []), ...(dryRun ? ["--dry-run"] : [])]);
        expect(result.code).toBe(1);
        expect(result.payload.conflicts).toContainEqual(expect.objectContaining({ path: file, reason: expect.stringContaining("UTF-8") }));
        expect(result.payload.written).toEqual([]);
        expect(await readFile(filePath)).toEqual(original);
        await expect(lstat(path.join(dir, ".ssealed", "manifest.json"))).rejects.toMatchObject({ code: "ENOENT" });
      }
    },
  );

  it.each(["doctor", "update", "upgrade", "eject"])("rejects invalid manifest UTF-8 before %s can accept it", async (command) => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const content = await readFile(manifestPath, "utf8");
    const original = Buffer.concat([Buffer.from(content.trimEnd().slice(0, -1)), Buffer.from(',"note":"caf'), Buffer.from([0xe9]), Buffer.from('"}\n')]);
    await writeFile(manifestPath, original);
    const result = await runJson([command, ...(command === "eject" ? ["runner"] : []), dir]);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "INVALID_MANIFEST" } } });
    expect(await readFile(manifestPath)).toEqual(original);
  });
});

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
    expect((await runJson(["upgrade", dir, "--density", "minimal", "--yes", "--force"])).code).toBe(0);
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
