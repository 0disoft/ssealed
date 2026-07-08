import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeScaffold, planScaffold, readPreviousManifest, withScaffoldWriteLock } from "../src/core/scaffold.js";
import { writePlannedFiles } from "../src/core/file-writer.js";
import { assertSafeTemplatePath } from "../src/core/path-safety.js";
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
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-writer-"));
  workdirs.push(dir);
  return dir;
}

async function copyManifestFixture(dir: string, fixtureName: string): Promise<void> {
  await mkdir(path.join(dir, ".ssealed"), { recursive: true });
  const fixture = await readFile(path.join(process.cwd(), "tests", "fixtures", "manifests", fixtureName), "utf8");
  await writeFile(path.join(dir, ".ssealed", "manifest.json"), fixture);
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

  it("dry-run refuses to read while a write lock exists", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    await writeFile(lockPath, "active write lock\n");

    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: false })).rejects.toThrow(/write command is already running/u);
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
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

  it("rolls back files written before SIGINT interrupts a write batch", async () => {
    const dir = await tempDir();
    const previousListenerCount = process.listenerCount("SIGINT");
    const planned = [
      { path: "first.txt", kind: "document", action: "create", content: "first\n" },
      {
        path: "second.txt",
        kind: "document",
        action: "create",
        get content() {
          process.emit("SIGINT", "SIGINT");
          return "second\n";
        },
      },
      { path: ".ssealed/manifest.json", kind: "manifest", action: "create", content: "{}\n" },
    ] as unknown as readonly PlannedFile[];

    await expect(writePlannedFiles(dir, planned)).rejects.toMatchObject({ code: "INTERRUPTED", signal: "SIGINT" });

    await expect(readFile(path.join(dir, "first.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, "second.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
    expect(process.listenerCount("SIGINT")).toBe(previousListenerCount);
  });

  it("removes the write lock after SIGTERM interrupts a locked task", async () => {
    const dir = await tempDir();

    await expect(
      withScaffoldWriteLock(dir, false, async () => {
        process.emit("SIGTERM", "SIGTERM");
      }),
    ).rejects.toMatchObject({ code: "INTERRUPTED", signal: "SIGTERM" });

    await expect(readFile(path.join(dir, ".ssealed-init.lock"), "utf8")).rejects.toThrow();
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

  it("reads legacy manifest fixtures with generated checksum fallback", async () => {
    const dir = await tempDir();
    await copyManifestFixture(dir, "v0_6_0-customized-seeded.json");

    const previous = await readPreviousManifest(dir);

    expect(previous.warnings).toHaveLength(0);
    expect(previous.settings).toEqual(expect.objectContaining({ scope: "general", runner: "none" }));
    expect(previous.files.get("README.md")).toEqual(
      expect.objectContaining({
        checksum: "sha256:accepted-readme",
        generatedChecksum: "sha256:generated-readme",
        initialChecksum: "sha256:generated-readme",
        ownership: "seeded",
        presence: "optional",
        status: "active",
      }),
    );
  });

  it("keeps retired files from manifest fixtures visible during upgrade planning", async () => {
    const dir = await tempDir();
    await copyManifestFixture(dir, "v0_6_1-retired-backend-file.json");

    const planned = await planScaffold({ command: "upgrade", target: dir, scope: "general", runner: "none", dryRun: true, force: true });

    expect(planned).toContainEqual(
      expect.objectContaining({
        path: "api/openapi.yaml",
        action: "retired",
        manifestStatus: "retired",
        previousGeneratedChecksum: "sha256:generated-openapi",
      }),
    );
  });

  it("reports invalid manifest fixtures as warnings", async () => {
    const dir = await tempDir();
    await copyManifestFixture(dir, "invalid-scope.json");

    const previous = await readPreviousManifest(dir);

    expect(previous.settings).toBeUndefined();
    expect(previous.files.size).toBe(0);
    expect(previous.warnings).toEqual([
      expect.objectContaining({
        code: "INVALID_MANIFEST",
        path: ".ssealed/manifest.json",
      }),
    ]);
  });

  it("treats oversized manifests as invalid without reading them into ownership state", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, ".ssealed"), { recursive: true });
    await writeFile(path.join(dir, ".ssealed", "manifest.json"), `${" ".repeat(1024 * 1024 + 1)}\n`);

    const previous = await readPreviousManifest(dir);

    expect(previous.settings).toBeUndefined();
    expect(previous.files.size).toBe(0);
    expect(previous.warnings).toEqual([
      {
        code: "INVALID_MANIFEST",
        path: ".ssealed/manifest.json",
        message: "Existing .ssealed/manifest.json exceeds the supported 1 MiB size limit.",
      },
    ]);
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

  it("does not rewrite the manifest when only key order differs from generated content", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const reordered = {
      files: manifest.files,
      runner: manifest.runner,
      density: manifest.density,
      addons: manifest.addons,
      profile: manifest.profile,
      scope: manifest.scope,
      generatedAt: manifest.generatedAt,
      version: manifest.version,
      tool: manifest.tool,
    };
    const reorderedContent = `${JSON.stringify(reordered, null, 2)}\n`;
    await writeFile(manifestPath, reorderedContent);

    const rerun = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });

    expect(rerun.written).not.toContain(".ssealed/manifest.json");
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(reorderedContent);
  });

  it("refuses to write a stale plan when a target file appears after planning", async () => {
    const dir = await tempDir();
    const planned = await planScaffold({ target: dir, scope: "general", runner: "none", dryRun: true, force: false });

    await writeFile(path.join(dir, "AGENTS.md"), "late user content\n");

    await expect(writePlannedFiles(dir, planned)).rejects.toThrow(/appeared after the scaffold plan/u);
    await expect(readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(dir, "AGENTS.md"), "utf8")).resolves.toBe("late user content\n");
  });

  it("refuses to write a stale plan when existing content changes after planning", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await writeFile(path.join(dir, "README.md"), "# Project README\n\nAccepted project-owned content.\n");
    const planned = await planScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: true, force: false });
    const manifestPath = path.join(dir, ".ssealed", "manifest.json");
    const externalManifest = "{\"external\":true}\n";

    await writeFile(manifestPath, externalManifest);

    await expect(writePlannedFiles(dir, planned)).rejects.toThrow(/content changed after the scaffold plan/u);
    await expect(readFile(manifestPath, "utf8")).resolves.toBe(externalManifest);
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

  it("retains previous scaffold files as retired when upgrade narrows the scaffold settings", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "backend", runner: "none", dryRun: false, force: false });

    const result = await executeScaffold({ command: "upgrade", target: dir, scope: "general", runner: "none", dryRun: false, force: true });

    expect(result.conflicts).toHaveLength(0);
    expect(result.files).toContainEqual(
      expect.objectContaining({
        path: "api/openapi.yaml",
        action: "retired",
        manifestStatus: "retired",
      }),
    );
    await expect(readFile(path.join(dir, "api", "openapi.yaml"), "utf8")).resolves.toContain("openapi: 3.1.0");
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    expect(manifest.files).toContainEqual(
      expect.objectContaining({
        path: "api/openapi.yaml",
        status: "retired",
      }),
    );
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

  it("does not let force overwrite seeded documents after accepting project-owned edits", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    const readmePath = path.join(dir, "README.md");
    const projectReadme = "# Project README\n\nThis repository has moved beyond the seed text.\n";
    await writeFile(readmePath, projectReadme);

    const accepted = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    expect(accepted.files.find((file) => file.path === "README.md")?.action).toBe("customized");

    const forced = await executeScaffold({ command: "update", target: dir, scope: "general", runner: "none", dryRun: false, force: true });

    expect(forced.files.find((file) => file.path === "README.md")?.action).toBe("customized");
    await expect(readFile(readmePath, "utf8")).resolves.toBe(projectReadme);
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8"));
    const readmeEntry = manifest.files.find((file: { path: string }) => file.path === "README.md");
    expect(readmeEntry.acceptedChecksum).not.toBe(readmeEntry.generatedChecksum);
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

  it("allows only one concurrent write run for the same target", async () => {
    const dir = await tempDir();
    const results = await Promise.allSettled([
      executeScaffold({ target: dir, scope: "fullstack", profile: "api-service", addons: ["desktop-app", "docs-site"], density: "strict", runner: "none", dryRun: false, force: false }),
      executeScaffold({ target: dir, scope: "fullstack", profile: "api-service", addons: ["desktop-app", "docs-site"], density: "strict", runner: "none", dryRun: false, force: false }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(String(rejected?.reason)).toContain("already running");
  });

  it("breaks an old scaffold lock only when explicitly requested", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    await writeFile(
      lockPath,
      JSON.stringify(
        {
          tool: "ssealed",
          pid: 999999999,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        null,
        2,
      ),
    );

    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false })).rejects.toThrow(/already running/u);
    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false, breakStaleLock: true })).resolves.toEqual(
      expect.objectContaining({
        written: expect.arrayContaining(["AGENTS.md"]),
      }),
    );
    await expect(readFile(lockPath, "utf8")).rejects.toThrow();
  });

  it("does not break a stale-aged lock whose process is still alive", async () => {
    const dir = await tempDir();
    const lockPath = path.join(dir, ".ssealed-init.lock");
    await writeFile(
      lockPath,
      JSON.stringify(
        {
          tool: "ssealed",
          pid: process.pid,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        null,
        2,
      ),
    );

    await expect(executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false, breakStaleLock: true })).rejects.toThrow(
      /not stale/u,
    );
    await expect(readFile(lockPath, "utf8")).resolves.toContain(`"pid": ${process.pid}`);
  });

  it("removes the scaffold lock after a successful write", async () => {
    const dir = await tempDir();
    await executeScaffold({ target: dir, scope: "general", runner: "none", dryRun: false, force: false });
    await expect(readFile(path.join(dir, ".ssealed-init.lock"), "utf8")).rejects.toThrow();
  });
});
