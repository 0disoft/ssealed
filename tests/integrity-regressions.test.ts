import { chmod, lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { mapWithConcurrency } from "../src/core/concurrency.js";
import { writePlannedFiles } from "../src/core/file-writer.js";
import { withScaffoldReadLock, withScaffoldWriteLock } from "../src/core/scaffold.js";
import { getScaffoldInterruptContext, withScaffoldSignalHandling } from "../src/core/signals.js";
import { gitignoreBlock } from "../src/templates/index.js";
import type { PlannedFile } from "../src/core/types.js";

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
  it.each(["update", "upgrade"] as const)("blocks manifest path case aliases before %s writes", async (command) => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { files: { path: string }[] };
    const readme = manifest.files.find((file) => file.path === "README.md");
    expect(readme).toBeDefined();
    readme!.path = "readme.md";
    const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(manifestPath, manifestContent);
    expect((await runJson(["doctor", dir])).code).toBe(0);

    for (const flags of [["--dry-run"], []]) {
      const result = await runJson([command, dir, "--yes", ...flags]);
      expect(result).toMatchObject({ code: 1, payload: { ok: false } });
      expect(result.payload.conflicts).toEqual([
        expect.objectContaining({ path: "README.md", action: "conflict", reason: expect.stringMatching(/readme\.md.*README\.md/u) }),
      ]);
      expect(result.payload.written).toEqual([]);
      await expect(readFile(manifestPath, "utf8")).resolves.toBe(manifestContent);
    }
    expect((await runJson(["doctor", dir])).code).toBe(0);
    readme!.path = "README.md";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect((await runJson([command, dir, "--yes"])).code).toBe(0);
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

  it.each(["init", "adopt", "update", "upgrade"] as const)("rejects linked generated directories while planning %s", async (command) => {
    for (const dryRun of [true, false]) {
      const dir = await tempDir();
      const external = await tempDir();
      const outsideDocs = path.join(external, "docs");
      const manifestPath = path.join(dir, ".ssealed", "manifest.json");
      let originalManifest: string | undefined;
      if (command === "update" || command === "upgrade") {
        expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);
        originalManifest = await readFile(manifestPath, "utf8");
        await rename(path.join(dir, "docs"), outsideDocs);
      } else {
        await mkdir(outsideDocs);
      }
      const sentinel = path.join(outsideDocs, "sentinel.txt");
      await writeFile(sentinel, "EXTERNAL_CONTENT\n");
      await symlink(outsideDocs, path.join(dir, "docs"), process.platform === "win32" ? "junction" : "dir");
      const args = [command, dir, "--yes", ...(dryRun ? ["--dry-run"] : [])];
      if (command === "init" || command === "adopt") {
        args.push("--scope", "general");
      }

      expect(await runJson(args)).toMatchObject({
        code: 1, payload: { ok: false, error: { code: "PATH_SAFETY_ERROR" } },
      });
      if (originalManifest === undefined) {
        await expect(lstat(manifestPath)).rejects.toMatchObject({ code: "ENOENT" });
        await expect(lstat(path.join(dir, "AGENTS.md"))).rejects.toMatchObject({ code: "ENOENT" });
      } else {
        await expect(readFile(manifestPath, "utf8")).resolves.toBe(originalManifest);
      }
      await expect(readFile(sentinel, "utf8")).resolves.toBe("EXTERNAL_CONTENT\n");
      await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it.each([
    { args: ["update"] },
    { args: ["upgrade"] },
    { args: ["eject", "runner"] },
  ])("distinguishes invalid and missing manifests for $args", async ({ args }) => {
    const invalid = await tempDir();
    const missing = await tempDir();
    const manifestPath = path.join(invalid, ".ssealed", "manifest.json");
    await mkdir(path.dirname(manifestPath));
    await writeFile(manifestPath, "{bad json\n");

    for (const flags of [[], ["--dry-run"]]) {
      expect(await runJson([...args, invalid, ...flags])).toMatchObject({
        code: 1, payload: { ok: false, error: { code: "INVALID_MANIFEST" } },
      });
      expect(await runJson([...args, missing, ...flags])).toMatchObject({
        code: 1, payload: { ok: false, error: { code: "MISSING_MANIFEST" } },
      });
    }
    await expect(readFile(manifestPath, "utf8")).resolves.toBe("{bad json\n");
    await expect(lstat(path.join(invalid, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(path.join(missing, ".ssealed"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reports INVALID_MANIFEST when doctor encounters a directory at the manifest path", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed", "manifest.json"), { recursive: true });
    const result = await runJson(["doctor", dir]);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "INVALID_MANIFEST" } } });
  });

  it.each([
    ["doctor"],
    ["init", "--scope", "general", "--dry-run"],
    ["update", "--dry-run"],
    ["upgrade", "--dry-run"],
    ["eject", "runner", "--dry-run"],
  ])("rejects a linked target root for %j", async (...args) => {
    const parent = await tempDir();
    const real = await tempDir();
    expect((await runJson(["init", real, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);
    const manifestPath = path.join(real, ".ssealed", "manifest.json");
    const originalManifest = await readFile(manifestPath, "utf8");
    const link = path.join(parent, "target-link");
    await symlink(real, link, process.platform === "win32" ? "junction" : "dir");

    const result = await runJson([...args, link]);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "PATH_SAFETY_ERROR" } } });
    expect(await readFile(manifestPath, "utf8")).toBe(originalManifest);
    await expect(lstat(path.join(real, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a dangling linked root before invoking a read task", async () => {
    const parent = await tempDir();
    const link = path.join(parent, "target-link");
    await symlink(path.join(parent, "missing"), link, process.platform === "win32" ? "junction" : "dir");
    const task = vi.fn(async () => "read-result");
    await expect(withScaffoldReadLock(link, task)).rejects.toMatchObject({ code: "PATH_SAFETY_ERROR" });
    expect(task).not.toHaveBeenCalled();
  });

  it.each([
    ["update"],
    ["upgrade"],
    ["eject", "runner"],
    ["update", "--dry-run"],
    ["upgrade", "--dry-run"],
    ["eject", "runner", "--dry-run"],
  ])("does not create missing target directories for %j", async (...args) => {
    const parent = await tempDir();
    const missingParent = path.join(parent, "missing-parent");
    const target = path.join(missingParent, "target");
    const result = await runJson([...args, target]);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "MISSING_MANIFEST" } } });
    await expect(lstat(missingParent)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an invalid eject subject without creating a target directory", async () => {
    const parent = await tempDir();
    const target = path.join(parent, "missing-target");
    const result = await runJson(["eject", "unknown", target]);
    expect(result).toMatchObject({ code: 1, payload: { error: { code: "INVALID_EJECT_TARGET" } } });
    await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("clears all addons during upgrade without deleting their documents", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--repo-type", "cli-tool", "--addon", "docs-site", "--yes"])).code).toBe(0);
    const addonDoc = path.join(dir, "docs", "docs-site", "information-architecture.md");
    const originalDoc = await readFile(addonDoc, "utf8");

    const conflicting = await runJson(["upgrade", dir, "--clear-addons", "--addon", "github-action", "--yes"]);
    expect(conflicting.code).toBe(1);
    expect(conflicting.payload.error).toMatchObject({ code: "CONFLICTING_ADDON_OPTIONS" });

    const cleared = await runJson(["upgrade", dir, "--clear-addons", "--yes"]);
    expect(cleared.code).toBe(0);
    expect(cleared.payload.addons).toEqual([]);
    expect(await readFile(addonDoc, "utf8")).toBe(originalDoc);
    expect((await runJson(["doctor", dir])).code).toBe(0);

    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    expect(manifest.addons).toEqual([]);
    expect(manifest.files).toContainEqual(expect.objectContaining({ path: "docs/docs-site/information-architecture.md", status: "retired" }));
  });

  it("can promote the last addon to the primary repository type", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--repo-type", "cli-tool", "--addon", "docs-site", "--yes"])).code).toBe(0);
    const upgraded = await runJson(["upgrade", dir, "--repo-type", "docs-site", "--yes"]);
    expect(upgraded.code).toBe(0);
    expect(upgraded.payload).toMatchObject({ profile: "docs-site", addons: [] });
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

  it("promotes an inherited addon while preserving other addons and customized documents", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--repo-type", "cli-tool", "--addon", "docs-site", "--addon", "github-action"])).code).toBe(0);
    const docPath = path.join(dir, "docs", "docs-site", "information-architecture.md");
    const customDoc = "# Project documentation\n\nKeep this structure.\n";
    await writeFile(docPath, customDoc);
    const upgraded = await runJson(["upgrade", dir, "--repo-type", "docs-site"]);
    expect(upgraded).toMatchObject({ code: 0, payload: { profile: "docs-site", addons: ["github-action"] } });
    expect(await readFile(docPath, "utf8")).toBe(customDoc);
    expect((await runJson(["doctor", dir, "--strict"])).code).toBe(0);

    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const originalManifest = await readFile(manifestPath, "utf8");
    const explicitDuplicate = await runJson(["upgrade", dir, "--repo-type", "docs-site", "--addon", "docs-site"]);
    expect(explicitDuplicate).toMatchObject({ code: 1, payload: { error: { code: "INVALID_ADDON" } } });
    expect(await readFile(manifestPath, "utf8")).toBe(originalManifest);
  });

  it("keeps user package scripts outside runner ownership across init and update", async () => {
    const dir = await tempDir();
    const packagePath = path.join(dir, "package.json");
    await writeFile(packagePath, '{"name":"example","scripts":{"test":"custom-test"}}\n');

    expect((await runJson(["init", dir, "--scope", "general", "--runner", "pnpm", "--yes"])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const packageEntry = manifest.files.find((file: { path: string }) => file.path === "package.json");
    expect(packageEntry.managedScripts).not.toHaveProperty("test");
    expect(packageEntry.managedScripts).toHaveProperty("lint");
    expect((await runJson(["doctor", dir])).code).toBe(0);
    delete packageEntry.managedScripts;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect((await runJson(["doctor", dir])).code).toBe(0);
    expect((await runJson(["update", dir, "--yes"])).code).toBe(0);
    expect((await runJson(["doctor", dir])).code).toBe(0);
    const updatedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(updatedManifest.files.find((file: { path: string }) => file.path === "package.json").managedScripts).not.toHaveProperty("test");

    const pkg = JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.test).toBe("custom-test");
    pkg.scripts.lint = "echo changed";
    await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
    expect((await runJson(["doctor", dir])).code).toBe(1);
    expect((await runJson(["update", dir, "--yes"])).code).toBe(1);
  });

  it("restores a deleted managed package script on update", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);
    const packagePath = path.join(dir, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> };
    const generatedLint = pkg.scripts.lint;
    delete pkg.scripts.lint;
    await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

    expect((await runJson(["doctor", dir])).code).toBe(1);
    expect((await runJson(["update", dir, "--yes"])).code).toBe(0);
    expect((JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> }).scripts.lint).toBe(generatedLint);
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

  it("releases package runner ownership when upgrading to none and safely reactivates it", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "pnpm", "--yes"])).code).toBe(0);
    const packagePath = path.join(dir, "package.json");
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const originalPackage = await readFile(packagePath, "utf8");

    expect((await runJson(["upgrade", dir, "--runner", "none", "--yes"])).code).toBe(0);
    expect(await readFile(packagePath, "utf8")).toBe(originalPackage);
    const retiredManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const retiredPackage = retiredManifest.files.find((file: { path: string }) => file.path === "package.json");
    expect(retiredPackage).toMatchObject({ ownership: "project-owned", status: "retired" });
    expect((await runJson(["doctor", dir])).code).toBe(0);

    retiredPackage.ownership = "block-managed";
    await writeFile(manifestPath, `${JSON.stringify(retiredManifest, null, 2)}\n`);
    expect((await runJson(["doctor", dir])).code).toBe(0);
    expect((await runJson(["update", dir, "--yes"])).code).toBe(0);
    const migrated = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(migrated.files.find((file: { path: string }) => file.path === "package.json").ownership).toBe("project-owned");

    const pkg = JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> };
    pkg.scripts.test = "custom-test";
    await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
    expect((await runJson(["doctor", dir])).code).toBe(0);
    expect((await runJson(["upgrade", dir, "--runner", "pnpm", "--yes"])).code).toBe(0);
    expect((JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> }).scripts.test).toBe("custom-test");
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

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

  it("uses the same managed-block grammar for doctor and update", async () => {
    const start = "# >>> ssealed ignore patterns >>>";
    const end = "# <<< ssealed ignore patterns <<<";
    for (const corrupt of [
      (base: string): string => `${base}${end}\n`,
      (base: string): string => base.replace(end, `${start}\n${end}`),
      (base: string): string => base.replace(start, `prefix ${start}`),
      (base: string): string => base.replace(end, ""),
    ]) {
      const dir = await tempDir();
      expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);
      const ignorePath = path.join(dir, ".gitignore");
      const corrupted = corrupt(await readFile(ignorePath, "utf8"));
      await writeFile(ignorePath, corrupted);

      const doctor = await runJson(["doctor", dir]);
      expect(doctor.code).toBe(1);
      expect(doctor.payload.checks).toContainEqual(expect.objectContaining({ path: ".gitignore", status: "block-modified" }));
      const update = await runJson(["update", dir, "--yes"]);
      expect(update.code).toBe(1);
      expect(update.payload.conflicts).toContainEqual(expect.objectContaining({ path: ".gitignore", action: "conflict" }));
      expect(await readFile(ignorePath, "utf8")).toBe(corrupted);
    }
  });

  it("accepts CR-only managed-block line endings", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);
    const ignorePath = path.join(dir, ".gitignore");
    await writeFile(ignorePath, (await readFile(ignorePath, "utf8")).replace(/\n/gu, "\r"));

    expect((await runJson(["doctor", dir])).code).toBe(0);
    expect((await runJson(["update", dir, "--yes"])).code).toBe(0);
    expect((await runJson(["doctor", dir])).code).toBe(0);
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

  it("preserves legacy compatibility metadata when ejecting runner ownership", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);

    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, `${JSON.stringify({ ...manifest, generatorVersion: "0.6.1", version: "0.6.1" }, null, 2)}\n`);
    const gitignorePath = path.join(dir, ".gitignore");
    await writeFile(gitignorePath, (await readFile(gitignorePath, "utf8")).replace(".ssealed-init.lock\n", ""));

    expect((await runJson(["doctor", dir])).code).toBe(0);
    expect((await runJson(["eject", "runner", dir])).code).toBe(0);
    expect(JSON.parse(await readFile(manifestPath, "utf8"))).toEqual(
      expect.objectContaining({ schemaVersion: 1, generatorVersion: "0.6.1", version: "0.6.1" }),
    );
    expect((await runJson(["doctor", dir])).code).toBe(0);
  });

  it("leaves the manifest untouched when ejecting an already project-owned runner", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);
    expect((await runJson(["eject", "runner", dir])).code).toBe(0);
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.generatedAt = "2020-01-01T00:00:00.000Z";
    const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(manifestPath, manifestContent);
    const packagePath = path.join(dir, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8"));
    pkg.scripts.lint = "echo project-owned";
    const packageContent = `${JSON.stringify(pkg, null, 2)}\n`;
    await writeFile(packagePath, packageContent);

    for (const flags of [["--dry-run"], []]) {
      const result = await runJson(["eject", "runner", dir, ...flags]);
      expect(result).toMatchObject({ code: 0, payload: { ok: true, status: "unchanged" } });
      expect(await readFile(manifestPath, "utf8")).toBe(manifestContent);
      expect(await readFile(packagePath, "utf8")).toBe(packageContent);
    }
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      expect(await main(["eject", "runner", dir])).toBe(0);
      expect(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("- unchanged: package.json");
      expect(await readFile(manifestPath, "utf8")).toBe(manifestContent);
    } finally {
      stdout.mockRestore();
    }
    expect((await runJson(["doctor", dir, "--strict"])).code).toBe(0);
  });

  it("rejects unknown future manifest schemas instead of guessing compatibility", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);

    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, `${JSON.stringify({ ...manifest, schemaVersion: 2 }, null, 2)}\n`);
    const originalManifest = await readFile(manifestPath, "utf8");
    const originalPackage = await readFile(path.join(dir, "package.json"), "utf8");

    const doctor = await runJson(["doctor", dir]);
    expect(doctor).toEqual({
      code: 1,
      payload: expect.objectContaining({
        ok: false,
        command: "doctor",
        error: expect.objectContaining({ code: "INVALID_MANIFEST" }),
      }),
    });
    for (const args of [
      ["init", dir, "--scope", "general", "--runner", "npm", "--yes"],
      ["adopt", dir, "--scope", "general", "--runner", "npm", "--yes"],
      ["update", dir, "--yes"],
      ["upgrade", dir, "--density", "strict", "--yes"],
      ["eject", "runner", dir],
    ]) {
      const result = await runJson(args);
      expect(result.code).toBe(1);
      expect(await readFile(manifestPath, "utf8")).toBe(originalManifest);
      expect(await readFile(path.join(dir, "package.json"), "utf8")).toBe(originalPackage);
    }
  });
});

describe("stale lock ownership", () => {
  it.each([
    { hostname: `${hostname()}-other`, pid: 999999999 },
    { hostname: hostname() },
    { hostname: hostname(), pid: 0 },
    { hostname: hostname(), pid: -1 },
    { hostname: hostname(), pid: 1.5 },
    { hostname: hostname(), pid: 2 ** 31 },
  ])("preserves an old lock whose process cannot be verified locally: %j", async (identity) => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    const lockContent = `${JSON.stringify({ tool: "ssealed", ...identity, createdAt: "2020-01-01T00:00:00.000Z" })}\n`;
    await writeFile(lockPath, lockContent);
    const task = vi.fn(async () => "write-result");
    await expect(withScaffoldWriteLock(dir, true, task)).rejects.toMatchObject({ code: "LOCK_EXISTS" });
    expect(task).not.toHaveBeenCalled();
    expect(await readFile(lockPath, "utf8")).toBe(lockContent);
  });

  it.each(["EPERM", "EACCES", "EIO"])("preserves an old lock when the process probe fails with %s", async (code) => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    const lockContent = `${JSON.stringify({ tool: "ssealed", hostname: hostname(), pid: process.pid, createdAt: "2020-01-01T00:00:00.000Z" })}\n`;
    await writeFile(lockPath, lockContent);
    const probe = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("Process state unavailable."), { code });
    });
    const task = vi.fn(async () => "write-result");
    try {
      await expect(withScaffoldWriteLock(dir, true, task)).rejects.toMatchObject({ code: "LOCK_EXISTS" });
      expect(task).not.toHaveBeenCalled();
      expect(await readFile(lockPath, "utf8")).toBe(lockContent);
    } finally {
      probe.mockRestore();
    }
  });
});

describe("bounded filesystem work", () => {
  it.each([{ reason: new Error("first failure") }, { reason: undefined }])("preserves the first concurrent failure ($reason)", async ({ reason }) => {
    const later = Promise.withResolvers<void>();
    const started: number[] = [];
    const operation = mapWithConcurrency([0, 1, 2], 2, async (value) => {
      started.push(value);
      if (value === 0) {
        throw reason;
      }
      await later.promise;
      throw new Error("later failure");
    });
    const rejection = expect(operation).rejects.toBe(reason);
    later.resolve();
    await rejection;
    expect(started).toEqual([0, 1]);
  });

  it("limits concurrent operations while preserving result order", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([0, 1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(peak).toBe(2);
    expect(results).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("waits for started operations to settle before reporting a failure", async () => {
    let slowOperationFinished = false;

    await expect(
      mapWithConcurrency(["slow", "fail", "never-start"], 2, async (value) => {
        if (value === "slow") {
          await new Promise((resolve) => setTimeout(resolve, 15));
          slowOperationFinished = true;
        }
        if (value === "fail") {
          throw new Error("injected mapper failure");
        }
        return value;
      }),
    ).rejects.toThrow("injected mapper failure");

    expect(slowOperationFinished).toBe(true);
  });
});

describe("file publication integrity", () => {
  it.each(["create", "overwrite"] as const)("rejects a replaced parent directory before %s publication", async (action) => {
    const dir = await tempDir();
    const external = await tempDir();
    const parent = path.join(dir, "owned");
    const moved = path.join(external, "moved");
    await mkdir(parent);
    if (action === "overwrite") {
      await writeFile(path.join(parent, "victim.txt"), "ORIGINAL\n");
    }
    const planned: PlannedFile = {
      path: "owned/victim.txt", kind: "document", action, content: "GENERATED\n",
      ...(action === "overwrite" ? { existingContent: "ORIGINAL\n" } : {}),
    };

    await expect(writePlannedFiles(dir, [planned], {
      beforeCommit: async () => {
        await rename(parent, moved);
        await symlink(moved, parent, process.platform === "win32" ? "junction" : "dir");
      },
    })).rejects.toThrow(/symlink/iu);
    if (action === "overwrite") {
      await expect(readFile(path.join(moved, "victim.txt"), "utf8")).resolves.toBe("ORIGINAL\n");
    } else {
      await expect(lstat(path.join(moved, "victim.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it.each(["create", "overwrite"] as const)("does not follow a replaced parent during %s rollback", async (action) => {
    const dir = await tempDir();
    const external = await tempDir();
    const parent = path.join(dir, "owned");
    await mkdir(parent);
    if (action === "overwrite") {
      await writeFile(path.join(parent, "victim.txt"), "ORIGINAL\n");
    }
    await writeFile(path.join(external, "victim.txt"), "GENERATED\n");
    const files: readonly PlannedFile[] = [
      {
        path: "owned/victim.txt", kind: "document", action, content: "GENERATED\n",
        ...(action === "overwrite" ? { existingContent: "ORIGINAL\n" } : {}),
      },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ];

    await expect(writePlannedFiles(dir, files, {
      beforeCommit: async (relativePath) => {
        if (relativePath === ".ssealed/manifest.json") {
          await rename(parent, path.join(dir, "held"));
          await symlink(external, parent, process.platform === "win32" ? "junction" : "dir");
          throw new Error("injected manifest write failure");
        }
      },
    })).rejects.toThrow(/recovery was incomplete.*symlink/iu);
    await expect(readFile(path.join(external, "victim.txt"), "utf8")).resolves.toBe("GENERATED\n");
    await expect(readFile(path.join(dir, "held", "victim.txt"), "utf8")).resolves.toBe("GENERATED\n");
  });

  it("does not overwrite a file that appears after the temporary file is staged", async () => {
    const dir = await tempDir();
    const planned: PlannedFile = { path: "victim.txt", kind: "document", action: "create", content: "GENERATED\n" };

    await expect(
      writePlannedFiles(dir, [planned], {
        beforeCommit: async (_relativePath, targetPath) => {
          await writeFile(targetPath, "USER_APPEARED\n", { flag: "wx" });
        },
      }),
    ).rejects.toThrow("file appeared after the scaffold plan was created");
    await expect(readFile(path.join(dir, "victim.txt"), "utf8")).resolves.toBe("USER_APPEARED\n");
  });

  it.skipIf(process.platform === "win32")("preserves POSIX mode when replacing an existing runner file", async () => {
    const dir = await tempDir();
    expect((await runJson(["init", dir, "--scope", "general", "--runner", "npm", "--yes"])).code).toBe(0);
    const packagePath = path.join(dir, "package.json");
    await chmod(packagePath, 0o600);

    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as { scripts: Record<string, string> };
    delete packageJson.scripts.lint;
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, { mode: 0o600 });
    expect((await runJson(["update", dir, "--yes"])).code).toBe(0);

    expect((await lstat(packagePath)).mode & 0o777).toBe(0o600);
  });

  it("does not delete a user replacement while rolling back a later failure", async () => {
    const dir = await tempDir();
    const files: readonly PlannedFile[] = [
      { path: "first.txt", kind: "document", action: "create", content: "FIRST_GENERATED\n" },
      { path: "second.txt", kind: "document", action: "create", content: "SECOND_GENERATED\n" },
    ];

    await expect(
      writePlannedFiles(dir, files, {
        beforeCommit: async (relativePath) => {
          if (relativePath === "second.txt") {
            let firstCommitted = false;
            for (let attempt = 0; attempt < 100; attempt += 1) {
              const content = await readFile(path.join(dir, "first.txt"), "utf8").catch(() => undefined);
              if (content === "FIRST_GENERATED\n") {
                firstCommitted = true;
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 1));
            }
            if (!firstCommitted) {
              throw new Error("first write did not commit before the rollback fixture deadline");
            }
            await writeFile(path.join(dir, "first.txt"), "USER_REPLACEMENT\n");
            throw new Error("injected second write failure");
          }
        },
      }),
    ).rejects.toThrow(/rollback.*first\.txt/iu);
    await expect(readFile(path.join(dir, "first.txt"), "utf8")).resolves.toBe("USER_REPLACEMENT\n");
  });
});

describe("lock and interrupt ownership", () => {
  it.each(["read", "write"] as const)("propagates undefined task failures after %s lock cleanup", async (mode) => {
    const dir = await tempDir();
    const task = async (): Promise<never> => { throw undefined; };
    const operation = mode === "read" ? withScaffoldReadLock(dir, task) : withScaffoldWriteLock(dir, false, task);
    await expect(operation).rejects.toBeUndefined();
    await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(withScaffoldWriteLock(dir, false, async () => "retry succeeded")).resolves.toBe("retry succeeded");
  });

  it("retains undefined task failure alongside a lock cleanup failure", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    const operation = withScaffoldWriteLock(dir, false, async () => {
      await rm(lockPath);
      await writeFile(lockPath, '{"lockId":"replacement"}\n');
      throw undefined;
    });
    await expect(operation).rejects.toMatchObject({ errors: [undefined, expect.objectContaining({ code: "LOCK_EXISTS" })] });
    await expect(readFile(lockPath, "utf8")).resolves.toContain('"replacement"');
  });

  it("keeps signal exit codes in JSON mode", async () => {
    for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143]] as const) {
      const dir = await tempDir();
      const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      let code: number | undefined;
      try {
        await expect(withScaffoldSignalHandling(async () => {
          process.emit(signal, signal);
          code = await main(["doctor", dir, "--json"]);
        })).rejects.toMatchObject({ code: "INTERRUPTED", signal });
        expect(code).toBe(exitCode);
        const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
        expect(payload.error).toMatchObject({ code: "INTERRUPTED", signal, exitCode });
      } finally {
        stdout.mockRestore();
      }
    }
  });

  it("releases its lock after an EEXIST error inside the task", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    const taskError = Object.assign(new Error("target appeared during write"), { code: "EEXIST" });

    await expect(withScaffoldWriteLock(dir, false, async () => { throw taskError; })).rejects.toBe(taskError);
    await expect(lstat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(withScaffoldWriteLock(dir, false, async () => "retried")).resolves.toBe("retried");
  });

  it("does not remove a lock file that was replaced while the task was running", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");

    await expect(
      withScaffoldWriteLock(dir, false, async () => {
        await rm(lockPath);
        await writeFile(lockPath, '{"lockId":"replacement"}\n');
      }),
    ).rejects.toThrow(/lock.*ownership/iu);
    await expect(readFile(lockPath, "utf8")).resolves.toContain('"replacement"');
  });

  it("keeps concurrent interrupt contexts isolated", async () => {
    let release: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const contexts: unknown[] = [];

    const first = withScaffoldSignalHandling(async () => {
      contexts.push(getScaffoldInterruptContext());
      await barrier;
    });
    const second = withScaffoldSignalHandling(async () => {
      contexts.push(getScaffoldInterruptContext());
      release?.();
    });
    await Promise.all([first, second]);

    expect(contexts).toHaveLength(2);
    expect(contexts[0]).not.toBe(contexts[1]);
  });
});
