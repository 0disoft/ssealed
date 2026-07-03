import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

  it("redacts generated and existing file contents from JSON output", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "echo SECRET_TOKEN_123" }, registry: "https://registry.internal.invalid" }, null, 2),
    );
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", dir, "--scope", "design", "--runner", "npm", "--dry-run", "--json"])).resolves.toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const rawPayload = String(stdout.mock.calls[0]?.[0]);
      expect(rawPayload).not.toContain("SECRET_TOKEN_123");
      expect(rawPayload).not.toContain("registry.internal.invalid");
      const payload = JSON.parse(rawPayload);
      expect(payload.ok).toBe(true);
      expect(payload.files.find((file: { path: string }) => file.path === "package.json")).toEqual(
        expect.objectContaining({ path: "package.json", kind: "runner", action: "merge" }),
      );
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
      await expect(main(["init", dir, "--scope", "design", "--dry-run", "--json"])).resolves.toBe(1);
      expect(stderr).not.toHaveBeenCalled();
      const payload = JSON.parse(String(stdout.mock.calls[0]?.[0]));
      expect(payload.ok).toBe(false);
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
});
