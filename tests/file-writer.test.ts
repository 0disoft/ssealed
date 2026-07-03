import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeScaffold, planScaffold } from "../src/core/scaffold.js";
import { assertSafeTemplatePath } from "../src/core/path-safety.js";

let workdirs: string[] = [];

beforeEach(() => {
  workdirs = [];
});

afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-writer-"));
  workdirs.push(dir);
  return dir;
}

describe("file writer behavior", () => {
  it("dry-run writes no files", async () => {
    const dir = await tempDir();
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: true, force: false });
    expect(result.files.some((file) => file.action === "create")).toBe(true);
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
  });

  it("dry-run does not create a missing target directory", async () => {
    const parent = await tempDir();
    const target = path.join(parent, "missing-target");
    const result = await executeScaffold({ target, scope: "design", runner: "none", dryRun: true, force: false });
    expect(result.files.some((file) => file.action === "create")).toBe(true);
    await expect(lstat(target)).rejects.toThrow();
  });

  it("conflicting files cause no partial writes without force", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "README.md"), "user readme\n");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toContain("README.md");
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });

  it("force overwrites conflicts", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "README.md"), "user readme\n");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: true });
    expect(result.conflicts).toHaveLength(0);
    const readme = await readFile(path.join(dir, "README.md"), "utf8");
    expect(readme).toContain("Repository Design Scaffold");
  });

  it("preserves existing .gitignore and appends managed block", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".gitignore"), "custom.local\n");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);
    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(content).toContain("custom.local");
    expect(content).toContain("# >>> ssealed ignore patterns >>>");
    expect(content).toContain("!.env.example");
  });

  it("appends a complete .gitignore managed block even when default patterns already exist", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".gitignore"), "node_modules/\n.env\n");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);

    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    const managedBlock = content.slice(
      content.indexOf("# >>> ssealed ignore patterns >>>"),
      content.indexOf("# <<< ssealed ignore patterns <<<") + "# <<< ssealed ignore patterns <<<".length,
    );
    expect(managedBlock).toContain("node_modules/");
    expect(managedBlock).toContain(".env");

    const rerun = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: true, force: false });
    expect(rerun.conflicts.map((file) => file.path)).not.toContain(".gitignore");
  });

  it("conflicts when existing .gitignore managed block differs", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, ".gitignore"),
      "# >>> ssealed ignore patterns >>>\nold\n# <<< ssealed ignore patterns <<<\n",
    );
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toContain(".gitignore");
  });

  it("force replaces only the .gitignore managed block", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, ".gitignore"),
      "custom.local\n# >>> ssealed ignore patterns >>>\nold\n# <<< ssealed ignore patterns <<<\n",
    );
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: true });
    expect(result.conflicts).toHaveLength(0);
    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(content).toContain("custom.local");
    expect(content).not.toContain("\nold\n");
    expect(content).toContain("node_modules/");
  });

  it("conflicts for differing .editorconfig and .gitattributes without force", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".editorconfig"), "root = false\n");
    await writeFile(path.join(dir, ".gitattributes"), "* text=false\n");
    const result = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toEqual(expect.arrayContaining([".editorconfig", ".gitattributes"]));
  });

  it("rejects unsafe template paths", () => {
    expect(() => assertSafeTemplatePath("../escape")).toThrow();
    expect(() => assertSafeTemplatePath("/absolute")).toThrow();
    expect(() => assertSafeTemplatePath("C:relative")).toThrow();
    expect(() => assertSafeTemplatePath("docs/CON.md")).toThrow();
  });

  it("plans manifest checksums", async () => {
    const dir = await tempDir();
    const planned = await planScaffold({ target: dir, scope: "design", runner: "none", dryRun: true, force: false });
    const manifest = planned.find((file) => file.path === ".ssealed/manifest.json");
    expect(manifest?.content).toContain("sha256:");
  });

  it("uses an existing manifest to mark previously generated files", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    const planned = await planScaffold({ target: dir, scope: "design", runner: "none", dryRun: true, force: false });
    const agents = planned.find((file) => file.path === "AGENTS.md");
    expect(agents?.previouslyGenerated).toBe(true);
  });

  it("does not conflict on the generated manifest only because generatedAt changes", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false });
    const rerun = await executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: true, force: false });
    expect(rerun.conflicts.map((file) => file.path)).not.toContain(".ssealed/manifest.json");
    expect(rerun.files.find((file) => file.path === ".ssealed/manifest.json")?.action).toBe("merge");
  });

  it("refuses to write through a symlinked generated directory when the platform permits the setup", async () => {
    const dir = await tempDir();
    const outside = await tempDir();
    try {
      await symlink(outside, path.join(dir, "docs"), "dir");
    } catch {
      return;
    }
    await expect(executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false })).rejects.toThrow(
      /symlinked directory/u,
    );
  });

  it("preflights symlinked generated directories before writing earlier scaffold files", async () => {
    const dir = await tempDir();
    const outside = await tempDir();
    try {
      await symlink(outside, path.join(dir, "docs"), "dir");
    } catch {
      return;
    }
    await expect(executeScaffold({ target: dir, scope: "design", runner: "none", dryRun: false, force: false })).rejects.toThrow(
      /symlinked directory/u,
    );
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });
});
