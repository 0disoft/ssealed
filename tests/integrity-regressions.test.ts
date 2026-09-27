import { chmod, lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { mapWithConcurrency } from "../src/core/concurrency.js";
import { writePlannedFiles } from "../src/core/file-writer.js";
import { withScaffoldWriteLock } from "../src/core/scaffold.js";
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
    const upgraded = await runJson(["upgrade", dir, "--repo-type", "docs-site", "--clear-addons", "--yes"]);
    expect(upgraded.code).toBe(0);
    expect(upgraded.payload).toMatchObject({ profile: "docs-site", addons: [] });
    expect((await runJson(["doctor", dir])).code).toBe(0);
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

describe("bounded filesystem work", () => {
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
