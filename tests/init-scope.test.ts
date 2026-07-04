import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeScaffold } from "../src/core/scaffold.js";
import { runners, scopes, type Runner, type Scope } from "../src/core/types.js";
import { templateFilesFor } from "../src/templates/index.js";

interface ManifestForTest {
  files: Array<{
    path: string;
    kind: string;
    checksum: string;
  }>;
}

let workdirs: string[] = [];

beforeEach(() => {
  workdirs = [];
});

afterEach(async () => {
  await Promise.all(workdirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-scope-"));
  workdirs.push(dir);
  return dir;
}

async function scaffold(scope: Scope, runner: Runner = "none"): Promise<string> {
  const dir = await tempDir();
  const result = await executeScaffold({ target: dir, scope, runner, dryRun: false, force: false });
  expect(result.conflicts).toHaveLength(0);
  return dir;
}

async function exists(root: string, relativePath: string): Promise<boolean> {
  try {
    await readFile(path.join(root, ...relativePath.split("/")));
    return true;
  } catch {
    return false;
  }
}

describe("scope generation", () => {
  it("generates backend files and excludes frontend-only contracts", async () => {
    const dir = await scaffold("backend");
    await expect(exists(dir, "docs/backend/README.md")).resolves.toBe(true);
    await expect(exists(dir, "api/openapi.yaml")).resolves.toBe(true);
    await expect(exists(dir, "db/schema.dbml")).resolves.toBe(true);
    await expect(exists(dir, ".agents/skills/backend-api/SKILL.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/frontend/FRONTEND_DESIGN.md")).resolves.toBe(false);
    await expect(exists(dir, "contracts/backend-api/openapi.yaml")).resolves.toBe(false);
  });

  it("generates frontend files and excludes backend internals", async () => {
    const dir = await scaffold("frontend");
    await expect(exists(dir, "docs/frontend/FRONTEND_DESIGN.md")).resolves.toBe(true);
    await expect(exists(dir, "contracts/backend-api/openapi.yaml")).resolves.toBe(true);
    await expect(exists(dir, ".agents/skills/frontend-ui/SKILL.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/backend/README.md")).resolves.toBe(false);
    await expect(exists(dir, "api/openapi.yaml")).resolves.toBe(false);
    await expect(exists(dir, "db/schema.dbml")).resolves.toBe(false);
  });

  it("generates fullstack files without consumed frontend contract folder", async () => {
    const dir = await scaffold("fullstack");
    await expect(exists(dir, "docs/backend/README.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/frontend/FRONTEND_DESIGN.md")).resolves.toBe(true);
    await expect(exists(dir, "api/openapi.yaml")).resolves.toBe(true);
    await expect(exists(dir, "db/schema.dbml")).resolves.toBe(true);
    await expect(exists(dir, "contracts/backend-api/openapi.yaml")).resolves.toBe(false);
  });

  it("generates design scope with common files only", async () => {
    const dir = await scaffold("design");
    await expect(exists(dir, "docs/README.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/backend/README.md")).resolves.toBe(false);
    await expect(exists(dir, "docs/frontend/FRONTEND_DESIGN.md")).resolves.toBe(false);
    await expect(exists(dir, "api/openapi.yaml")).resolves.toBe(false);
    await expect(exists(dir, "db/schema.dbml")).resolves.toBe(false);
    await expect(exists(dir, "contracts/backend-api/openapi.yaml")).resolves.toBe(false);
  });

  it("generates hygiene files for every scope and records hygiene in manifest", async () => {
    const dir = await scaffold("backend");
    await expect(exists(dir, ".editorconfig")).resolves.toBe(true);
    await expect(exists(dir, ".gitattributes")).resolves.toBe(true);
    await expect(exists(dir, ".gitignore")).resolves.toBe(true);
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")) as ManifestForTest;
    expect(manifest.files).toContainEqual(expect.objectContaining({ path: ".editorconfig", kind: "hygiene" }));
    expect(manifest.files.every((file) => file.checksum.startsWith("sha256:"))).toBe(true);
  });

  it("does not generate bunfig.toml for any scope", async () => {
    for (const scope of ["backend", "frontend", "fullstack", "design"] as const) {
      const dir = await scaffold(scope);
      await expect(exists(dir, "bunfig.toml")).resolves.toBe(false);
    }
  });

  it("skill files include name and description frontmatter", async () => {
    const dir = await scaffold("backend");
    const skill = await readFile(path.join(dir, ".agents", "skills", "backend-api", "SKILL.md"), "utf8");
    expect(skill).toMatch(/^---\nname: backend-api\ndescription:/u);
  });

  it("generates CODEOWNERS as an explicit commented placeholder", async () => {
    const dir = await scaffold("design");
    const codeowners = await readFile(path.join(dir, ".github", "CODEOWNERS"), "utf8");
    expect(codeowners).toContain("Replace @REPLACE_WITH_OWNER");
    expect(codeowners).toContain("# * @REPLACE_WITH_OWNER");
    expect(codeowners).not.toContain("\n* @REPLACE_WITH_OWNER");
  });

  it("keeps generated OpenAPI and JSON examples aligned for pagination and create requests", async () => {
    const dir = await scaffold("backend");
    const openapi = await readFile(path.join(dir, "api", "openapi.yaml"), "utf8");
    const paginatedExample = await readFile(path.join(dir, "api", "examples", "paginated-response.json"), "utf8");
    expect(paginatedExample).toContain('"limit"');
    expect(openapi).toContain("required: [limit, nextCursor]");
    expect(openapi).toContain("limit:");
    expect(openapi).toContain("CreateResourceRequest:");
    expect(openapi).toMatch(/Idempotency-Key[\s\S]*required: true/u);
    expect(openapi).toMatch(/post:[\s\S]*requestBody:[\s\S]*CreateResourceRequest/u);
  });

  it("does not generate duplicate template paths for any scope and runner", () => {
    for (const scope of scopes) {
      for (const runner of runners) {
        const files = templateFilesFor(scope, runner);
        const paths = files.map((file) => file.path);
        expect(new Set(paths).size, `${scope}/${runner}`).toBe(paths.length);
      }
    }
  });
});
