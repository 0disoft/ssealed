import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeScaffold } from "../src/core/scaffold.js";
import type { Runner } from "../src/core/types.js";
import { runInit } from "../src/commands/init.js";
import { validationScripts } from "../src/templates/runners.js";

interface PackageJsonForTest {
  scripts: Record<string, string>;
  name?: string;
}

let workdirs: string[] = [];

beforeEach(() => {
  workdirs = [];
});

afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-runner-"));
  workdirs.push(dir);
  return dir;
}

async function exists(root: string, relativePath: string): Promise<boolean> {
  try {
    await readFile(path.join(root, ...relativePath.split("/")));
    return true;
  } catch {
    return false;
  }
}

async function scaffold(runner: Runner): Promise<string> {
  const dir = await tempDir();
  const result = await executeScaffold({ target: dir, scope: "design", runner, dryRun: false, force: false });
  expect(result.conflicts).toHaveLength(0);
  return dir;
}

describe("runner generation", () => {
  it("runner none generates no task runner files", async () => {
    const dir = await scaffold("none");
    await expect(exists(dir, "Makefile")).resolves.toBe(false);
    await expect(exists(dir, "justfile")).resolves.toBe(false);
    await expect(exists(dir, "Taskfile.yml")).resolves.toBe(false);
    await expect(exists(dir, "package.json")).resolves.toBe(false);
  });

  it("runner make generates failing unconfigured targets", async () => {
    const dir = await scaffold("make");
    const content = await readFile(path.join(dir, "Makefile"), "utf8");
    expect(content).toContain(".PHONY: format lint typecheck test contract migration-check smoke docs check");
    expect(content).toContain("format:");
    expect(content).toContain("docs:");
    expect(content).toContain("@exit 1");
  });

  it("runner just generates failing unconfigured recipes", async () => {
    const dir = await scaffold("just");
    const content = await readFile(path.join(dir, "justfile"), "utf8");
    expect(content).toContain("typecheck:");
    expect(content).toContain("@exit 1");
  });

  it("runner task generates failing unconfigured tasks", async () => {
    const dir = await scaffold("task");
    const content = await readFile(path.join(dir, "Taskfile.yml"), "utf8");
    expect(content).toContain("version: '3'");
    expect(content).toContain("- exit 1");
  });

  it("npm runner creates package scripts", async () => {
    const dir = await scaffold("npm");
    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as PackageJsonForTest;
    expect(pkg.scripts.check).toContain("check is not configured");
  });

  it("pnpm runner merges package scripts without overwriting existing scripts", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "package.json"), '{\n  "scripts": {\n    "test": "custom-test"\n  },\n  "name": "example"\n}\n');
    const result = await executeScaffold({ target: dir, scope: "design", runner: "pnpm", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);
    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as PackageJsonForTest;
    expect(pkg.name).toBe("example");
    expect(pkg.scripts.test).toBe("custom-test");
    expect(pkg.scripts.typecheck).toContain("typecheck is not configured");
  });

  it("force conflicts instead of overwriting user-owned package scripts", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "package.json"), '{\n  "scripts": {\n    "test": "custom-test"\n  }\n}\n');
    const result = await executeScaffold({ target: dir, scope: "design", runner: "npm", dryRun: false, force: true });
    expect(result.conflicts.map((file) => file.path)).toContain("package.json");
    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as PackageJsonForTest;
    expect(pkg.scripts.test).toBe("custom-test");
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });

  it("force updates generated validation scripts in package.json", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ scripts: { test: validationScripts("npm").test } }, null, 2));
    const result = await executeScaffold({ target: dir, scope: "design", runner: "pnpm", dryRun: false, force: true });
    expect(result.conflicts).toHaveLength(0);
    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as PackageJsonForTest;
    expect(pkg.scripts.test).toBe(validationScripts("pnpm").test);
  });

  it("invalid package.json conflicts for npm runner", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "package.json"), "{nope");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "npm", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toContain("package.json");
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });

  it("rejects bun as a runner value", async () => {
    const dir = await tempDir();
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(runInit({ target: dir, scope: "design", runner: "bun", yes: true, dryRun: true, force: false, json: true })).resolves.toBe(1);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.error.code).toBe("INVALID_RUNNER");
      await expect(readFile(path.join(dir, "bunfig.toml"), "utf8")).rejects.toThrow();
    } finally {
      stdout.mockRestore();
    }
  });
});
