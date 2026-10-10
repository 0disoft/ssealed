import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { executeScaffold } from "../src/core/scaffold.js";
import { sha256 } from "../src/core/checksum.js";

const hooks = vi.hoisted(() => ({
  packagePath: undefined as string | undefined,
  reads: 0,
  afterPackageRead: undefined as (() => Promise<void>) | undefined,
  beforeManifestStage: undefined as (() => Promise<void>) | undefined,
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const targeted = String(args[0]) === hooks.packagePath;
      if (targeted) hooks.reads += 1;
      const content = await actual.readFile(...args);
      if (targeted) {
        const callback = hooks.afterPackageRead; hooks.afterPackageRead = undefined;
        await callback?.();
      }
      return content;
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      if (path.basename(String(args[0])).startsWith(".manifest.json.") && hooks.beforeManifestStage !== undefined) {
        const callback = hooks.beforeManifestStage; hooks.beforeManifestStage = undefined;
        await callback();
      }
      return handle;
    },
  };
});

let workdirs: string[] = [];
beforeEach(() => { workdirs = []; hooks.packagePath = undefined; hooks.reads = 0; hooks.afterPackageRead = undefined; hooks.beforeManifestStage = undefined; });
afterEach(async () => {
  hooks.packagePath = undefined; hooks.afterPackageRead = undefined; hooks.beforeManifestStage = undefined; vi.restoreAllMocks();
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
async function setup(runner: "npm" | "pnpm" = "npm"): Promise<{ root: string; packagePath: string; manifestPath: string; manifest: Buffer }> {
  const root = await mkdtemp(path.join(tmpdir(), "ssealed-eject-package-")); workdirs.push(root);
  await executeScaffold({ target: root, scope: "general", runner, density: "minimal", dryRun: false, force: false });
  const packagePath = path.join(root, "package.json"); const manifestPath = path.join(root, ".ssealed", "manifest.json");
  return { root, packagePath, manifestPath, manifest: await readFile(manifestPath) };
}
async function eject(root: string, dryRun = false): Promise<{ code: number; payload: Record<string, unknown> }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try { return { code: await main(["eject", "runner", root, "--json", ...(dryRun ? ["--dry-run"] : [])]), payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) }; }
  finally { stdout.mockRestore(); }
}
async function expectCleanMetadata(state: Awaited<ReturnType<typeof setup>>): Promise<void> {
  await expect(readFile(state.manifestPath)).resolves.toEqual(state.manifest);
  expect(await readdir(path.dirname(state.manifestPath))).toEqual(["manifest.json"]);
  await expect(lstat(path.join(state.root, ".ssealed-init.lock"))).rejects.toMatchObject({ code: "ENOENT" });
}

describe("eject package state", () => {
  it.each((["npm", "pnpm"] as const).flatMap((runner) => [false, true].map((dryRun) => ({ runner, dryRun }))))("rejects invalid UTF-8 without transferring $runner ownership (dry-run: $dryRun)", async ({ runner, dryRun }) => {
    const state = await setup(runner);
    const original = Buffer.concat([Buffer.from('{"name":"caf'), Buffer.from([0xe9]), Buffer.from('"}\n')]);
    await writeFile(state.packagePath, original);
    expect(await eject(state.root, dryRun)).toMatchObject({ code: 1, payload: { ok: false, error: { code: "INVALID_PACKAGE_FILE", message: expect.stringContaining("UTF-8") } } });
    await expect(readFile(state.packagePath)).resolves.toEqual(original);
    await expectCleanMetadata(state);
  });

  it.each([false, true])("refuses non-regular package entries before reading them (dry-run: %s)", async (dryRun) => {
    const state = await setup();
    await rm(state.packagePath); await mkdir(state.packagePath); await writeFile(path.join(state.packagePath, "user-note.txt"), "USER_CONTENT\n");
    hooks.packagePath = state.packagePath;
    expect(await eject(state.root, dryRun)).toMatchObject({ code: 1, payload: { ok: false, error: { code: "INVALID_PACKAGE_FILE", message: expect.stringContaining("regular file") } } });
    expect(hooks.reads).toBe(0);
    expect((await lstat(state.packagePath)).isDirectory()).toBe(true);
    await expect(readFile(path.join(state.packagePath, "user-note.txt"), "utf8")).resolves.toBe("USER_CONTENT\n");
    await expectCleanMetadata(state);
  });

  it.each(["changed", "deleted", "appeared"] as const)("preserves ownership when package.json is %s before manifest publication", async (change) => {
    const state = await setup();
    const replacement = '{"scripts":{"test":"node user-test.js"},"note":"USER_CONTENT"}\n';
    hooks.packagePath = state.packagePath;
    let changed = false;
    const mutation = async () => { if (change === "deleted") await rm(state.packagePath); else await writeFile(state.packagePath, replacement); changed = true; };
    if (change === "appeared") { await rm(state.packagePath); hooks.beforeManifestStage = mutation; }
    else hooks.afterPackageRead = mutation;
    const result = await eject(state.root);
    expect(changed).toBe(true);
    expect(result).toMatchObject({ code: 1, payload: { ok: false, error: { code: "WRITE_FAILED", message: expect.stringMatching(/package.json.*changed/iu) } } });
    if (change === "deleted") await expect(lstat(state.packagePath)).rejects.toMatchObject({ code: "ENOENT" });
    else await expect(readFile(state.packagePath, "utf8")).resolves.toBe(replacement);
    await expectCleanMetadata(state);
  });

  it("preserves valid Unicode, a literal replacement character, and a BOM during ejection", async () => {
    const state = await setup();
    const content = '\uFEFF{"name":"café-한글-\uFFFD","scripts":{"test":"node user-test.js"}}\n';
    await writeFile(state.packagePath, content);
    expect(await eject(state.root)).toMatchObject({ code: 0, payload: { ok: true, ownership: "project-owned" } });
    await expect(readFile(state.packagePath, "utf8")).resolves.toBe(content);
    const manifest = JSON.parse(await readFile(state.manifestPath, "utf8"));
    expect(manifest.files.find((file: { path: string }) => file.path === "package.json")).toMatchObject({ ownership: "project-owned", acceptedChecksum: sha256(content) });
  });

  it("continues allowing ejection of an already missing optional package", async () => {
    const state = await setup();
    await rm(state.packagePath);
    expect(await eject(state.root)).toMatchObject({ code: 0, payload: { ok: true, ownership: "project-owned" } });
    await expect(lstat(state.packagePath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
