import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; });
afterEach(async () => { await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true }))); });
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-upgrade-"));
  workdirs.push(dir);
  return dir;
}
async function runJson(args: string[]): Promise<{ code: number; payload: Record<string, unknown> }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    const code = await main([...args, "--json"]);
    return { code, payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) };
  } finally { stdout.mockRestore(); }
}
async function backend(): Promise<string> {
  const dir = await tempDir();
  expect((await runJson(["init", dir, "--scope", "backend", "--density", "minimal", "--runner", "none"])).code).toBe(0);
  return dir;
}

describe("upgrade settings consistency", () => {
  it("refuses a scope change without force before accepting unchanged obsolete agent instructions", async () => {
    const dir = await backend();
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = await readFile(manifestPath, "utf8");
    const agents = await readFile(path.join(dir, "AGENTS.md"), "utf8");
    for (const flags of [["--dry-run"], []]) {
      const result = await runJson(["upgrade", dir, "--scope", "frontend", ...flags]);
      expect(result.code).toBe(1);
      expect(result.payload.conflicts).toContainEqual(expect.objectContaining({ path: "AGENTS.md", previouslyGenerated: true, reason: expect.stringContaining("--force") }));
      await expect(readFile(manifestPath, "utf8")).resolves.toBe(manifest);
      await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).resolves.toBe(agents);
      await expect(lstat(path.join(dir, "docs", "frontend"))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("updates untouched instructions with force so the manifest and agent scope agree", async () => {
    const dir = await backend();
    expect((await runJson(["upgrade", dir, "--scope", "frontend", "--force"])).code).toBe(0);
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).resolves.toContain("Scope: frontend");
    expect(JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).scope).toBe("frontend");
    expect((await runJson(["doctor", dir, "--strict"])).code).toBe(0);
  });

  it("preserves actual user edits and identifies instructions requiring manual review", async () => {
    const dir = await backend();
    const agentsPath = path.join(dir, "AGENTS.md");
    const custom = `${await readFile(agentsPath, "utf8")}\nUser instruction: preserve this decision.\n`;
    await writeFile(agentsPath, custom);
    const result = await runJson(["upgrade", dir, "--scope", "frontend", "--force"]);
    expect(result.code).toBe(0);
    expect(result.payload.files).toContainEqual(expect.objectContaining({ path: "AGENTS.md", action: "customized", reason: expect.stringContaining("review") }));
    await expect(readFile(agentsPath, "utf8")).resolves.toBe(custom);
  });
});
