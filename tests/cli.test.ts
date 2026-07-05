import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";

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
      await expect(main(["init", "./one", "./two", "--scope", "design", "--dry-run"])).resolves.toBe(1);
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
      expect(payload).toEqual({ ok: false, error: { code: "INVALID_SCOPE", message: "Invalid scope: nope. Valid scopes: backend, frontend, fullstack, design" } });
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });

  it("returns JSON errors for invalid profiles", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "--scope", "design", "--profile", "nope", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload).toEqual({
        ok: false,
        error: { code: "INVALID_PROFILE", message: "Invalid profile: nope. Valid profiles: generic, cli-tool, api-service, desktop-app, library" },
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
      await expect(main(["init", "--scope", "design", "--density", "huge", "--json"])).resolves.toBe(1);
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
      await expect(main(["init", dir, "--scope", "design", "--profile", "cli-tool", "--runner", "npm", "--dry-run", "--json"])).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const rawPayload = String(stdout.mock.calls[0]?.[0]);
      expect(rawPayload).not.toContain("SECRET_TOKEN_123");
      expect(rawPayload).not.toContain("registry.internal.invalid");
      const payload = JSON.parse(rawPayload);
      expect(payload.ok).toBe(true);
      expect(payload.command).toBe("init");
      expect(payload.profile).toBe("cli-tool");
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

  it("reports manifest-tracked file drift through doctor JSON output", async () => {
    const dir = await tempDir();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "design", "--yes", "--json"])).resolves.toBe(0);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(0);
      const okPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(okPayload).toEqual(
        expect.objectContaining({
          ok: true,
          command: "doctor",
          scope: "design",
          density: "standard",
        }),
      );

      const agentsPath = path.join(dir, "AGENTS.md");
      await writeFile(agentsPath, `${await readFile(agentsPath, "utf8")}\nuser edit\n`);
      stdout.mockClear();

      await expect(main(["doctor", dir, "--json"])).resolves.toBe(1);
      const driftPayload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(driftPayload.ok).toBe(false);
      expect(driftPayload.checks).toContainEqual(expect.objectContaining({ path: "AGENTS.md", status: "modified" }));
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
      await expect(main(["init", dir, "--scope", "design", "--dry-run", "--json"])).resolves.toBe(0);
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
      await expect(main(["init", dir, "--scope", "design", "--json"])).resolves.toBe(1);
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
});
