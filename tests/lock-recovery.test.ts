import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { executeScaffold } from "../src/core/scaffold.js";

const hooks = vi.hoisted(() => ({
  partialFailure: undefined as Error | undefined,
  replacePartial: false,
  renameFailure: undefined as ((destination: string) => Error | undefined) | undefined,
  removalFailure: undefined as Error | undefined,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      const lockPath = String(args[0]);
      const failure = hooks.partialFailure;
      if (lockPath.endsWith(`${path.sep}.ssealed-init.lock`) && args[1] === "wx" && failure) {
        const write = handle.writeFile.bind(handle);
        handle.writeFile = async () => { await write('{"tool":'); throw failure; };
        if (hooks.replacePartial) {
          const close = handle.close.bind(handle);
          handle.close = async () => {
            handle.close = close;
            await close();
            await actual.rename(lockPath, `${lockPath}.held`);
            await actual.writeFile(lockPath, '{"lockId":"replacement"}\n');
          };
        }
      }
      return handle;
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      const failure = hooks.renameFailure?.(String(args[1]));
      if (failure) throw failure;
      return actual.rename(...args);
    },
    rm: async (...args: Parameters<typeof actual.rm>) => {
      if (String(args[0]).endsWith(`${path.sep}.ssealed-init.lock`) && hooks.removalFailure) throw hooks.removalFailure;
      return actual.rm(...args);
    },
  };
});

let workdirs: string[] = [];
function resetHooks(): void {
  hooks.partialFailure = undefined; hooks.replacePartial = false; hooks.renameFailure = undefined; hooks.removalFailure = undefined;
}
beforeEach(() => { workdirs = []; resetHooks(); });
afterEach(async () => { resetHooks(); await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true }))); });
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-lock-recovery-")); workdirs.push(dir); return dir;
}
interface ErrorPayload {
  readonly error: { readonly message: string; readonly causes?: readonly ErrorPayload["error"][] };
}
async function runJson(args: string[]): Promise<{ code: number; payload: ErrorPayload }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try { const code = await main([...args, "--json"]); return { code, payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) }; }
  finally { stdout.mockRestore(); }
}

describe("lock initialization and failure recovery", () => {
  it("removes its partially initialized lock and allows a normal retry after ENOSPC", async () => {
    const dir = await tempDir();
    hooks.partialFailure = Object.assign(new Error("ENOSPC: injected lock metadata write failure"), { code: "ENOSPC" });
    const failed = await runJson(["init", dir, "--scope", "general"]);
    expect(failed).toMatchObject({ code: 1, payload: { error: { code: "FILESYSTEM_ERROR", message: expect.stringContaining("ENOSPC") } } });
    await expect(lstat(path.join(dir, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    resetHooks();
    expect((await runJson(["init", dir, "--scope", "general"])).code).toBe(0);
  });

  it("preserves a replaced partial lock and reports both original and cleanup errors", async () => {
    const dir = await tempDir();
    hooks.partialFailure = Object.assign(new Error("ENOSPC: injected lock metadata write failure"), { code: "ENOSPC" });
    hooks.replacePartial = true;
    const failed = await runJson(["init", dir, "--scope", "general"]);
    expect(failed.payload.error.message).toMatch(/ENOSPC.*ownership/iu);
    expect(failed.payload.error.causes).toMatchObject([{ code: "FILESYSTEM_ERROR" }, { code: "LOCK_EXISTS" }]);
    await expect(readFile(path.join(dir, ".ssealed-init.lock"), "utf8")).resolves.toBe('{"lockId":"replacement"}\n');
  });

  it("retains manifest, rollback, and lock-removal failures in the public JSON error", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "npm", dryRun: false, force: false });
    const packagePath = path.join(dir, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8")); delete pkg.scripts.lint;
    await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
    let packageWrites = 0;
    hooks.renameFailure = (destination) => {
      if (destination === packagePath && ++packageWrites === 2) return Object.assign(new Error("EIO: package.json rollback failed"), { code: "EIO" });
      if (destination === path.join(dir, ".ssealed", "manifest.json")) return Object.assign(new Error("ENOSPC: manifest publication failed"), { code: "ENOSPC" });
      return undefined;
    };
    hooks.removalFailure = Object.assign(new Error("EACCES: lock removal failed"), { code: "EACCES" });
    const failed = await runJson(["update", dir]);
    expect(failed.code).toBe(1);
    expect(failed.payload.error.message).toMatch(/ENOSPC.*recovery was incomplete.*package.json.*lock removal/iu);
    expect(failed.payload.error.causes?.[0]?.causes).toMatchObject([{ message: expect.stringContaining("manifest publication") }, { message: expect.stringContaining("package.json rollback") }]);
    expect(failed.payload.error.causes?.[1]?.message).toContain("lock removal");
  });
});
