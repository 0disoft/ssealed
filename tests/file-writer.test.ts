import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeScaffold, planScaffold } from "../src/core/scaffold.js";
import { assertSafeTemplatePath } from "../src/core/path-safety.js";
import { gitignoreBlock } from "../src/templates/index.js";

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
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    expect(result.files.some((file) => file.action === "create")).toBe(true);
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
  });

  it("dry-run does not create a missing target directory", async () => {
    const parent = await tempDir();
    const target = path.join(parent, "missing-target");
    const result = await executeScaffold({ target, scope: "general", runner: "none", dryRun: true, force: false });
    expect(result.files.some((file) => file.action === "create")).toBe(true);
    await expect(lstat(target)).rejects.toThrow();
  });

  it("conflicting files cause no partial writes without force", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "README.md"), "user readme\n");
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toContain("README.md");
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
    await expect(lstat(path.join(dir, ".ssealed"))).rejects.toThrow();
  });

  it("force does not overwrite files that are not verified as scaffold-managed", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "README.md"), "user readme\n");
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: true });
    expect(result.conflicts.map((file) => file.path)).toContain("README.md");
    const readme = await readFile(path.join(dir, "README.md"), "utf8");
    expect(readme).toBe("user readme\n");
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });

  it("force permits reruns when existing scaffold-managed files are unchanged", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const result = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: true });
    expect(result.conflicts).toHaveLength(0);
  });

  it("preserves existing .gitignore and appends managed block", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".gitignore"), "custom.local\n");
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);
    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(content).toContain("custom.local");
    expect(content).toContain("# >>> ssealed ignore patterns >>>");
    expect(content).toContain("!.env.example");
  });

  it("appends a complete .gitignore managed block even when default patterns already exist", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, ".gitignore"), "node_modules/\n.env\n");
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);

    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    const managedBlock = content.slice(
      content.indexOf("# >>> ssealed ignore patterns >>>"),
      content.indexOf("# <<< ssealed ignore patterns <<<") + "# <<< ssealed ignore patterns <<<".length,
    );
    expect(managedBlock).toContain("node_modules/");
    expect(managedBlock).toContain(".env");

    const rerun = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    expect(rerun.conflicts.map((file) => file.path)).not.toContain(".gitignore");
  });

  it("appends a .gitignore managed block even when every generated pattern already exists outside the block", async () => {
    const dir = await tempDir();
    const existingPatterns = gitignoreBlock()
      .split("\n")
      .filter((line) => line.length > 0 && !line.includes("ssealed ignore patterns"))
      .join("\n");
    await writeFile(path.join(dir, ".gitignore"), `${existingPatterns}\n`);
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts).toHaveLength(0);

    const content = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(content.match(/# >>> ssealed ignore patterns >>>/gu)).toHaveLength(1);
    expect(content).toContain(existingPatterns);
  });

  it("conflicts when existing .gitignore managed block differs", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, ".gitignore"),
      "# >>> ssealed ignore patterns >>>\nold\n# <<< ssealed ignore patterns <<<\n",
    );
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toContain(".gitignore");
  });

  it("force replaces only the .gitignore managed block", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, ".gitignore"),
      "custom.local\n# >>> ssealed ignore patterns >>>\nold\n# <<< ssealed ignore patterns <<<\n",
    );
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: true });
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
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).toEqual(expect.arrayContaining([".editorconfig", ".gitattributes"]));
  });

  it("rejects unsafe template paths", () => {
    expect(() => assertSafeTemplatePath("../escape")).toThrow();
    expect(() => assertSafeTemplatePath("/absolute")).toThrow();
    expect(() => assertSafeTemplatePath("C:relative")).toThrow();
    expect(() => assertSafeTemplatePath("docs\\escape.md")).toThrow();
    expect(() => assertSafeTemplatePath("docs/CON.md")).toThrow();
  });

  it("plans manifest checksums", async () => {
    const dir = await tempDir();
    const planned = await planScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    const manifest = planned.find((file) => file.path === ".ssealed/manifest.json");
    expect(manifest?.content).toContain("sha256:");
  });

  it("uses an existing manifest to mark previously generated files", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const planned = await planScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    const agents = planned.find((file) => file.path === "AGENTS.md");
    expect(agents?.previouslyGenerated).toBe(true);
  });

  it("refuses init when a valid scaffold manifest already exists", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const rerun = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: true });
    const conflict = rerun.conflicts.find((file) => file.path === ".ssealed/manifest.json");
    expect(conflict?.reason).toContain("Existing scaffold already has a valid .ssealed/manifest.json");
    expect(conflict?.reason).toContain("ssealed update");
  });

  it("does not conflict on the generated manifest only because generatedAt changes", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const rerun = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    expect(rerun.conflicts.map((file) => file.path)).not.toContain(".ssealed/manifest.json");
    expect(rerun.files.find((file) => file.path === ".ssealed/manifest.json")?.action).toBe("unchanged");
  });

  it("does not rewrite the manifest when only generatedAt would change", async () => {
    const dir = await tempDir();
    const first = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(first.written).toContain(".ssealed/manifest.json");
    const before = await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8");
    const rerun = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const after = await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8");
    expect(rerun.written).not.toContain(".ssealed/manifest.json");
    expect(after).toBe(before);
  });

  it("keeps planned manifest content aligned with unchanged existing manifest content", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const before = await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8");
    const planned = await planScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    const manifest = planned.find((file) => file.path === ".ssealed/manifest.json");
    expect(manifest?.action).toBe("unchanged");
    expect(manifest?.content).toBe(before);
  });

  it("normalizes legacy design scope manifests during update", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    await writeFile(manifestPath, `${JSON.stringify({ ...manifest, scope: "design" }, null, 2)}\n`);

    const result = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).not.toContain(".ssealed/manifest.json");
    const updated = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(updated.scope).toBe("general");
  });

  it("update conflicts instead of migrating an existing scaffold to a different profile", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const result = await executeScaffold({ command: "update", target: dir, scope: "general", profile: "cli-tool", runner: "none", dryRun: false, force: true });
    const conflict = result.conflicts.find((file) => file.path === ".ssealed/manifest.json");
    expect(conflict?.reason).toContain("profile generic -> cli-tool");
    await expect(readFile(path.join(dir, "docs", "cli", "command-contract.md"), "utf8")).rejects.toThrow();
  });

  it("upgrade permits explicit profile migration", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const result = await executeScaffold({ command: "upgrade", target: dir, scope: "general", profile: "cli-tool", runner: "none", dryRun: false, force: true });
    expect(result.conflicts).toHaveLength(0);
    await expect(readFile(path.join(dir, "docs", "cli", "command-contract.md"), "utf8")).resolves.toContain("Command Contract");
  });

  it("updates the manifest instead of conflicting after user edits outside a managed .gitignore block", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await writeFile(path.join(dir, ".gitignore"), `custom.local\n${await readFile(path.join(dir, ".gitignore"), "utf8")}`);
    const result = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(result.conflicts.map((file) => file.path)).not.toContain(".ssealed/manifest.json");
    expect(result.written).toContain(".ssealed/manifest.json");
  });

  it("accepts project-owned edits to seeded documents during update", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const readmePath = path.join(dir, "README.md");
    await writeFile(readmePath, "# Project README\n\nThis repository has moved beyond the seed text.\n");

    const result = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });

    expect(result.conflicts.map((file) => file.path)).not.toContain("README.md");
    expect(result.files.find((file) => file.path === "README.md")?.action).toBe("customized");
    expect(result.written).toContain(".ssealed/manifest.json");
    await expect(readFile(readmePath, "utf8")).resolves.toBe("# Project README\n\nThis repository has moved beyond the seed text.\n");
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    expect(manifest.files).toContainEqual(
      expect.objectContaining({
        path: "README.md",
        ownership: "seeded",
        presence: "optional",
        status: "active",
        acceptedChecksum: expect.any(String),
      }),
    );
  });

  it("keeps deleted seeded documents retired during update", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await rm(path.join(dir, "docs", "product", "01-roadmap.md"));

    const result = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });

    expect(result.conflicts.map((file) => file.path)).not.toContain("docs/product/01-roadmap.md");
    expect(result.files.find((file) => file.path === "docs/product/01-roadmap.md")?.action).toBe("retired");
    expect(result.written).not.toContain("docs/product/01-roadmap.md");
    await expect(readFile(path.join(dir, "docs", "product", "01-roadmap.md"), "utf8")).rejects.toThrow();
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    expect(manifest.files).toContainEqual(
      expect.objectContaining({
        path: "docs/product/01-roadmap.md",
        ownership: "seeded",
        presence: "optional",
        status: "retired",
      }),
    );
  });

  it("conflicts clearly when an existing path is not a regular file even with force", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, "README.md"));
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: true });
    const conflict = result.conflicts.find((file) => file.path === "README.md");
    expect(conflict?.reason).toBe("Existing path is a directory, not a regular file.");
    await expect(lstat(path.join(dir, "AGENTS.md"))).rejects.toThrow();
  });

  it("warns when an existing manifest is invalid and ignored", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed"), { recursive: true });
    await writeFile(path.join(dir, ".ssealed", "manifest.json"), "{bad json\n");
    const result = await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    expect(result.warnings).toEqual([
      {
        code: "INVALID_MANIFEST",
        path: ".ssealed/manifest.json",
        message: "Existing .ssealed/manifest.json could not be parsed as a valid ssealed manifest and was ignored for ownership checks.",
      },
    ]);
  });

  it("refuses to write through a symlinked generated directory when the platform permits the setup", async () => {
    const dir = await tempDir();
    const outside = await tempDir();
    try {
      await symlink(outside, path.join(dir, "docs"), "dir");
    } catch {
      return;
    }
    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false })).rejects.toThrow(
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
    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false })).rejects.toThrow(
      /symlinked directory/u,
    );
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
  });

  it("refuses to create a missing target under a symlinked parent without creating the real directory", async () => {
    const parent = await tempDir();
    const real = await tempDir();
    const link = path.join(parent, "link");
    try {
      await symlink(real, link, "dir");
    } catch {
      return;
    }
    await expect(executeScaffold({ target: path.join(link, "new-target"), scope: "general", runner: "none", dryRun: false, force: false })).rejects.toThrow(
      /symlinked path/u,
    );
    await expect(lstat(path.join(real, "new-target"))).rejects.toThrow();
  });

  it("refuses to run when another scaffold lock exists and preserves that lock", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    await writeFile(lockPath, "existing lock\n");

    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false })).rejects.toThrow(
      /already running/u,
    );
    await expect(readFile(lockPath, "utf8")).resolves.toBe("existing lock\n");
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
  });

  it("removes the scaffold lock after a successful write", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await expect(readFile(path.join(dir, ".ssealed-init.lock"), "utf8")).rejects.toThrow();
  });
});
