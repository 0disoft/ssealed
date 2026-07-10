import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-cli-"));
  workdirs.push(dir);
  return dir;
}

describe("CLI argument parsing", () => {
  it("rejects more than one init target instead of silently ignoring extra positionals", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "./one", "./two", "--scope", "general", "--dry-run"])).resolves.toBe(1);
      expect(stderr).toHaveBeenCalledWith("ssealed: init accepts at most one target, got 2\n");
      expect(stdout).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns JSON errors for invalid JSON-mode input", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "--scope", "nope", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: { code: "INVALID_SCOPE", message: "Invalid scope: nope. Valid scopes: backend, frontend, fullstack, general, mobile, infra, data" },
      });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns JSON errors for invalid repository types", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "--scope", "general", "--profile", "nope", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: {
          code: "INVALID_PROFILE",
          message:
            "Invalid repository type: nope. Valid repository types: generic, cli-tool, api-service, desktop-app, library, web-app, mobile-app, sdk, worker-service, infra-module, data-pipeline, github-action, browser-extension, plugin, docs-site, monorepo",
        },
      });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns JSON errors for invalid densities", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "--scope", "general", "--density", "huge", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: { code: "INVALID_DENSITY", message: "Invalid density: huge. Valid densities: minimal, standard, strict" },
      });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("redacts generated and existing file contents from JSON output", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "echo SECRET_TOKEN_123" }, registry: "https://registry.internal.invalid" }, null, 2),
    );
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--profile", "cli-tool", "--runner", "npm", "--dry-run", "--json"])).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const rawPayload = String(stdout.mock.calls[0]?.[0]);
      expect(rawPayload).not.toContain("SECRET_TOKEN_123");
      expect(rawPayload).not.toContain("registry.internal.invalid");
      const payload = JSON.parse(rawPayload);
      expect(payload.ok).toBe(true);
      expect(payload.command).toBe("init");
      expect(payload.profile).toBe("cli-tool");
      expect(payload.repoType).toBe("cli-tool");
      expect(payload.addons).toEqual([]);
      expect(payload.density).toBe("standard");
      expect(payload.files).toContainEqual(expect.objectContaining({ path: "docs/cli/command-contract.md", kind: "document", action: "create" }));
      expect(payload.files.find((file: { path: string }) => file.path === "package.json")).toEqual(
        expect.objectContaining({ path: "package.json", kind: "runner", action: "merge" }),
      );
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("accepts repo-type and repeatable addons", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(
        main(["init", dir, "--scope", "general", "--repo-type", "cli-tool", "--addon", "github-action", "--addon", "docs-site", "--json"]),
      ).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.profile).toBe("cli-tool");
      expect(payload.repoType).toBe("cli-tool");
      expect(payload.addons).toEqual(["github-action", "docs-site"]);
      expect(payload.files).toContainEqual(expect.objectContaining({ path: "docs/github-action/action-contract.md", action: "create" }));
      expect(payload.files).toContainEqual(expect.objectContaining({ path: "docs/docs-site/information-architecture.md", action: "create" }));
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("adopts an existing repository without treating differing files as conflicts", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "README.md"), "# Existing Project\n\nKeep this content.\n");
    await writeFile(path.join(dir, ".gitattributes"), "* text=auto\n");
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(
        main(["adopt", dir, "--scope", "general", "--repo-type", "library", "--density", "minimal", "--runner", "none", "--json"]),
      ).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const adoptPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(adoptPayload).toEqual(
        expect.objectContaining({
          ok: true,
          command: "adopt",
          profile: "library",
          density: "minimal",
          runner: "none",
        }),
      );
      expect(adoptPayload.conflicts).toEqual([]);
      expect(adoptPayload.files).toContainEqual(
        expect.objectContaining({
          path: "README.md",
          action: "customized",
          ownership: "project-owned",
          reason: "Existing file was adopted as project-owned content.",
        }),
      );
      expect(adoptPayload.files).toContainEqual(expect.objectContaining({ path: "AGENTS.md", action: "create", ownership: "seeded" }));
      await expect(readFile(path.join(dir, "README.md"), "utf8")).resolves.toBe("# Existing Project\n\nKeep this content.\n");

      stdout.mockClear();
      await expect(main(["doctor", dir, "--strict", "--json"])).resolves.toBe(0);
      const doctorPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(doctorPayload.ok).toBe(true);
      expect(doctorPayload.checks).toContainEqual(
        expect.objectContaining({
          path: "README.md",
          ownership: "project-owned",
          status: "project-owned",
        }),
      );
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("normalizes the legacy design scope alias to general", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "design", "--yes", "--json"])).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.scope).toBe("general");
      const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
      expect(manifest.scope).toBe("general");
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("treats seeded document edits as customization by default and drift in strict mode", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const okPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(okPayload).toEqual(
        expect.objectContaining({
          ok: true,
          command: "doctor",
          scope: "general",
          density: "standard",
        }),
      );

      const agentsPath = path.join(dir, "AGENTS.md");
      await writeFile(agentsPath, `${await readFile(agentsPath, "utf8")}\nuser edit\n`);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const legacyPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(legacyPayload.ok).toBe(true);
      expect(legacyPayload.strict).toBe(false);
      expect(legacyPayload.checks).toContainEqual(expect.objectContaining({ path: "AGENTS.md", status: "customized", ownership: "seeded" }));
      stdout.mockClear();

      await expect(main(["doctor", dir, "--strict", "--json"])).resolves.toBe(1);
      const strictPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(strictPayload.ok).toBe(false);
      expect(strictPayload.strict).toBe(true);
      expect(strictPayload.checks).toContainEqual(expect.objectContaining({ path: "AGENTS.md", status: "modified" }));
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("allows missing optional seeded files by default but fails them in strict mode", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      stdout.mockClear();

      await rm(path.join(dir, "docs", "product", "01-roadmap.md"));

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const defaultPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(defaultPayload.checks).toContainEqual(expect.objectContaining({ path: "docs/product/01-roadmap.md", status: "retired" }));
      stdout.mockClear();

      await expect(main(["doctor", dir, "--strict", "--json"])).resolves.toBe(1);
      const strictPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(strictPayload.checks).toContainEqual(expect.objectContaining({ path: "docs/product/01-roadmap.md", status: "missing" }));
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns a consistent JSON error envelope when doctor has no manifest", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual(
        expect.objectContaining({
          ok: false,
          command: "doctor",
          error: {
            code: "MISSING_MANIFEST",
            message: "Missing .ssealed/manifest.json. Use ssealed init to create a new scaffold first.",
          },
        }),
      );
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns a consistent JSON error envelope when doctor has an invalid manifest", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed"), { recursive: true });
    await writeFile(path.join(dir, ".ssealed", "manifest.json"), "{bad json\n");
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual(
        expect.objectContaining({
          ok: false,
          command: "doctor",
          error: {
            code: "INVALID_MANIFEST",
            message: "Existing .ssealed/manifest.json is invalid. Repair or remove it before running doctor.",
          },
          warnings: [
            expect.objectContaining({
              code: "INVALID_MANIFEST",
              path: ".ssealed/manifest.json",
            }),
          ],
        }),
      );
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("reports modified .gitignore when an extra valid block hides a changed managed block", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      const gitignorePath = path.join(dir, ".gitignore");
      await writeFile(
        gitignorePath,
        [
          "# >>> ssealed ignore patterns >>>",
          "dist/",
          "# <<< ssealed ignore patterns <<<",
          "",
          gitignoreBlock().trimEnd(),
          "",
        ].join("\n"),
      );
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(false);
      expect(payload.checks).toContainEqual(
        expect.objectContaining({
          path: ".gitignore",
          status: "block-modified",
        }),
      );
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("accepts project-owned .gitignore rules outside the managed block", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      const gitignorePath = path.join(dir, ".gitignore");
      await writeFile(gitignorePath, `__pycache__/\n.pytest_cache/\n${await readFile(gitignorePath, "utf8")}`);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(true);
      expect(payload.checks).toContainEqual(expect.objectContaining({ path: ".gitignore", status: "ok" }));
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("accepts legacy .gitignore managed blocks for manifests before lock ignore support", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      const manifestPath = path.join(dir, ".ssealed", "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      await writeFile(manifestPath, `${JSON.stringify({ ...manifest, version: "0.6.1" }, null, 2)}\n`);
      const gitignorePath = path.join(dir, ".gitignore");
      const legacyGitignore = (await readFile(gitignorePath, "utf8")).replace(".ssealed-init.lock\n", "");
      await writeFile(gitignorePath, `__pycache__/\n.pytest_cache/\n${legacyGitignore}`);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(true);
      expect(payload.checks).toContainEqual(expect.objectContaining({ path: ".gitignore", status: "ok" }));
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("ejects package runner ownership before accepting project-owned package scripts", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--runner", "npm", "--yes", "--json"])).resolves.toBe(0);
      const packagePath = path.join(dir, "package.json");
      const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
      await writeFile(packagePath, `${JSON.stringify({ ...packageJson, scripts: { ...packageJson.scripts, test: "vitest run" } }, null, 2)}\n`);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      const driftPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(driftPayload.ok).toBe(false);
      expect(driftPayload.checks).toContainEqual(expect.objectContaining({ path: "package.json", status: "block-modified" }));
      stdout.mockClear();

      await expect(main(["eject", "runner", dir, "--json"])).resolves.toBe(0);
      const ejectPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(ejectPayload).toEqual(expect.objectContaining({ ok: true, command: "eject", subject: "runner", path: "package.json", ownership: "project-owned" }));
      const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
      expect(manifest.files).toContainEqual(expect.objectContaining({ path: "package.json", ownership: "project-owned", presence: "optional" }));
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const doctorPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(doctorPayload.ok).toBe(true);
      expect(doctorPayload.checks).toContainEqual(
        expect.objectContaining({ path: "package.json", ownership: "project-owned", status: "project-owned" }),
      );
      stdout.mockClear();

      await expect(main(["doctor", dir, "--strict", "--json"])).resolves.toBe(0);
      const strictPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(strictPayload.ok).toBe(true);
      expect(strictPayload.checks).toContainEqual(
        expect.objectContaining({ path: "package.json", ownership: "project-owned", status: "project-owned" }),
      );
      stdout.mockClear();

      await expect(main(["update", dir, "--json"])).resolves.toBe(0);
      const updatePayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(updatePayload.ok).toBe(true);
      expect(updatePayload.files).toContainEqual(
        expect.objectContaining({ path: "package.json", ownership: "project-owned", action: "customized" }),
      );
      const updatedPackage = JSON.parse(await readFile(packagePath, "utf8"));
      expect(updatedPackage.scripts.test).toBe("vitest run");
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("does not eject non-package runner files", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--runner", "make", "--yes", "--json"])).resolves.toBe(0);
      stdout.mockClear();

      await expect(main(["eject", "runner", dir, "--json"])).resolves.toBe(1);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual(
        expect.objectContaining({
          ok: false,
          command: "eject",
          error: expect.objectContaining({ code: "RUNNER_NOT_BLOCK_MANAGED" }),
        }),
      );
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("still reports legacy .gitignore managed blocks as drift for current manifests", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      const gitignorePath = path.join(dir, ".gitignore");
      await writeFile(gitignorePath, (await readFile(gitignorePath, "utf8")).replace(".ssealed-init.lock\n", ""));
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(false);
      expect(payload.checks).toContainEqual(expect.objectContaining({ path: ".gitignore", status: "block-modified" }));
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("refuses doctor reads through symlinked generated directories", async () => {
    const dir = await tempDir();
    const outside = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--yes", "--json"])).resolves.toBe(0);
      await rm(path.join(dir, "docs"), { recursive: true, force: true });
      try {
        await symlink(outside, path.join(dir, "docs"), "dir");
      } catch {
        return;
      }
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(false);
      expect(payload.checks).toContainEqual(
        expect.objectContaining({
          path: "docs/README.md",
          status: "unreadable",
        }),
      );
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns machine-readable JSON warnings for invalid existing manifests", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed"), { recursive: true });
    await writeFile(path.join(dir, ".ssealed", "manifest.json"), "{bad json\n");
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--dry-run", "--json"])).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(true);
      expect(payload.warnings).toEqual([
        expect.objectContaining({
          code: "INVALID_MANIFEST",
          path: ".ssealed/manifest.json",
        }),
      ]);
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns JSON errors for runtime failures in JSON mode", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".ssealed-init.lock"), "existing lock\n");
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "general", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: expect.objectContaining({
          code: "LOCK_EXISTS",
        }),
      });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns a lock error when doctor runs during an active write lock", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".ssealed-init.lock"), "active write lock\n");
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: {
          code: "LOCK_EXISTS",
          message: "Another ssealed command is already running for this target. Try again after it finishes.",
        },
      });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });
});
