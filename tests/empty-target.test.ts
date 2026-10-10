import { lstat, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { executeScaffold } from "../src/core/scaffold.js";

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; });
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-empty-target-")); workdirs.push(dir); return dir;
}
async function readOptional(filePath: string): Promise<string | undefined> {
  try { return await readFile(filePath, "utf8"); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

describe("explicit empty CLI targets", () => {
  it.each(["init", "adopt", "update", "upgrade", "doctor", "eject"].flatMap((command) => [
    { command, json: true }, { command, json: false },
  ]))("rejects an empty $command target without changing the current directory (json: $json)", async ({ command, json }) => {
    const dir = await tempDir();
    if (command !== "init" && command !== "adopt") {
      await executeScaffold({ target: dir, scope: "general", runner: "npm", density: "minimal", dryRun: false, force: false });
    }
    await writeFile(path.join(dir, "sentinel.txt"), "USER_CONTENT\n");
    const entries = (await readdir(dir)).sort();
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const previousManifest = await readOptional(manifestPath);
    const packagePath = path.join(dir, "package.json");
    const previousPackage = await readOptional(packagePath);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const args = [command, ...(command === "eject" ? ["runner"] : []), ""];
    if (command === "init" || command === "adopt") args.push("--scope", "general", "--yes");
    if (json) args.push("--json");
    expect(await main(args)).toBe(1);
    if (json) {
      expect(JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""))).toMatchObject({
        ok: false, error: { code: "INVALID_TARGET", message: expect.stringContaining("Target cannot be empty") },
      });
      expect(stderr).not.toHaveBeenCalled();
    } else {
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("Target cannot be empty");
    }
    expect((await readdir(dir)).sort()).toEqual(entries);
    await expect(readFile(path.join(dir, "sentinel.txt"), "utf8")).resolves.toBe("USER_CONTENT\n");
    expect(await readOptional(manifestPath)).toBe(previousManifest);
    expect(await readOptional(packagePath)).toBe(previousPackage);
    await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([undefined, "."])("continues using the current directory when the target is %s", async (target) => {
    const dir = await tempDir();
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await main(["init", ...(target === undefined ? [] : [target]), "--scope", "general", "--runner", "none", "--json"])).toBe(0);
    expect(JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(""))).toMatchObject({ ok: true, target: dir });
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).resolves.toContain("Scope: general");
  });
});
