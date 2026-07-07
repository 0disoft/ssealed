import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeScaffold } from "../src/core/scaffold.js";
import { addons as supportedAddons, densities, profiles, runners, scopes, type Addon, type Density, type Profile, type Runner, type Scope } from "../src/core/types.js";
import { templateFilesFor } from "../src/templates/index.js";

interface ManifestForTest {
  profile: string;
  addons: string[];
  density: string;
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

async function scaffold(scope: Scope, runner: Runner = "none", profile?: Profile, density?: Density): Promise<string> {
  const dir = await tempDir();
  const result = await executeScaffold({
    target: dir,
    scope,
    runner,
    dryRun: false,
    force: false,
    ...(profile === undefined ? {} : { profile }),
    ...(density === undefined ? {} : { density }),
  });
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

const markdownLabelLinePattern = /^[A-Za-z][A-Za-z0-9 /()_-]*: .+$/u;

function stripMarkdownFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) {
    return content;
  }
  const end = content.indexOf("\n---\n", 4);
  return end === -1 ? content : content.slice(end + "\n---\n".length);
}

function markdownParagraphBlocks(content: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  let inFence = false;
  const flush = (): void => {
    if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  };

  for (const line of stripMarkdownFrontmatter(content).split("\n")) {
    if (/^(```|~~~)/u.test(line)) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (/^(#|[-*+]\s|\d+\.\s|>|\|)/u.test(line)) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

function adjacentPlainMetadataBlocks(content: string): string[] {
  return markdownParagraphBlocks(content)
    .filter((block) => block.length >= 2 && block.every((line) => markdownLabelLinePattern.test(line)))
    .map((block) => block.join("\n"));
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

  it("generates general scope with common files only", async () => {
    const dir = await scaffold("general");
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
    expect(manifest.profile).toBe("generic");
    expect(manifest.addons).toEqual([]);
    expect(manifest.density).toBe("standard");
    expect(manifest.files).toContainEqual(expect.objectContaining({ path: ".editorconfig", kind: "hygiene" }));
    expect(manifest.files.every((file) => file.checksum.startsWith("sha256:"))).toBe(true);
  });

  it("does not generate bunfig.toml for any scope and profile", () => {
    for (const scope of scopes) {
      for (const profile of profiles) {
        for (const runner of runners) {
          for (const density of densities) {
            const files = templateFilesFor(scope, runner, profile, density);
            expect(files.map((file) => file.path), `${scope}/${profile}/${runner}/${density}`).not.toContain("bunfig.toml");
          }
        }
      }
    }
  });

  it("density minimal keeps the core scaffold small", async () => {
    const dir = await scaffold("general", "none", "generic", "minimal");
    await expect(exists(dir, "AGENTS.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/ops/00-operational-contract.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/ops/release.md")).resolves.toBe(false);
    await expect(exists(dir, ".agents/validations/default.md")).resolves.toBe(false);
  });

  it("density strict includes expanded risk and release surfaces", async () => {
    const dir = await scaffold("backend", "none", "generic", "strict");
    await expect(exists(dir, "docs/engineering/08-threat-model.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/backend/10-data-integrity.md")).resolves.toBe(true);
    await expect(exists(dir, ".agents/validations/release-readiness.md")).resolves.toBe(true);
  });

  it("generates CLI tool profile contracts without changing the selected scope", async () => {
    const dir = await scaffold("general", "none", "cli-tool");
    await expect(exists(dir, "docs/cli/command-contract.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/cli/output-and-exit-codes.md")).resolves.toBe(true);
    await expect(exists(dir, ".agents/skills/cli-tool/SKILL.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/backend/README.md")).resolves.toBe(false);
  });

  it("generates API service profile contracts and avoids duplicate backend OpenAPI ownership", async () => {
    const designDir = await scaffold("general", "none", "api-service");
    await expect(exists(designDir, "docs/api-service/api-lifecycle.md")).resolves.toBe(true);
    await expect(exists(designDir, "api/openapi.yaml")).resolves.toBe(true);

    const backendDir = await scaffold("backend", "none", "api-service");
    await expect(exists(backendDir, "docs/api-service/api-lifecycle.md")).resolves.toBe(true);
    await expect(exists(backendDir, "api/openapi.yaml")).resolves.toBe(true);
    const files = templateFilesFor("backend", "none", "api-service");
    expect(files.filter((file) => file.path === "api/openapi.yaml")).toHaveLength(1);
  });

  it("generates desktop app profile contracts", async () => {
    const dir = await scaffold("general", "none", "desktop-app");
    await expect(exists(dir, "docs/desktop/installers.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/desktop/auto-update.md")).resolves.toBe(true);
    await expect(exists(dir, ".agents/skills/desktop-app/SKILL.md")).resolves.toBe(true);
  });

  it("generates library profile contracts", async () => {
    const dir = await scaffold("general", "none", "library");
    await expect(exists(dir, "docs/library/public-api.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/library/semver.md")).resolves.toBe(true);
    await expect(exists(dir, ".agents/skills/library-package/SKILL.md")).resolves.toBe(true);
  });

  it("generates ownership files for mobile, infra, and data scopes", async () => {
    const mobileDir = await scaffold("mobile");
    await expect(exists(mobileDir, "docs/mobile/app-contract.md")).resolves.toBe(true);
    await expect(exists(mobileDir, ".agents/checklists/mobile-app.md")).resolves.toBe(true);

    const infraDir = await scaffold("infra");
    await expect(exists(infraDir, "docs/infra/module-contract.md")).resolves.toBe(true);
    await expect(exists(infraDir, ".agents/checklists/infra-change.md")).resolves.toBe(true);

    const dataDir = await scaffold("data");
    await expect(exists(dataDir, "docs/data/pipeline-contract.md")).resolves.toBe(true);
    await expect(exists(dataDir, ".agents/checklists/data-pipeline.md")).resolves.toBe(true);
  });

  it("generates addon repository-shape contracts without changing the primary profile", async () => {
    const dir = await tempDir();
    const result = await executeScaffold({
      target: dir,
      scope: "general",
      profile: "cli-tool",
      addons: ["github-action", "docs-site"],
      runner: "none",
      dryRun: false,
      force: false,
    });
    expect(result.conflicts).toHaveLength(0);
    expect(result.profile).toBe("cli-tool");
    expect(result.addons).toEqual(["github-action", "docs-site"]);
    await expect(exists(dir, "docs/cli/command-contract.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/github-action/action-contract.md")).resolves.toBe(true);
    await expect(exists(dir, "docs/docs-site/information-architecture.md")).resolves.toBe(true);
    const manifest = JSON.parse(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")) as ManifestForTest;
    expect(manifest.profile).toBe("cli-tool");
    expect(manifest.addons).toEqual(["github-action", "docs-site"]);
  });

  it("renders generated document metadata as Markdown list blocks", async () => {
    const dir = await tempDir();
    const result = await executeScaffold({
      target: dir,
      scope: "general",
      profile: "library",
      addons: ["sdk"],
      runner: "none",
      dryRun: false,
      force: false,
    });
    expect(result.conflicts).toHaveLength(0);

    const readme = await readFile(path.join(dir, "README.md"), "utf8");
    expect(readme).toContain(
      [
        "- Status: Draft",
        "- Scope: general",
        "- Repository Type: library",
        "- Addons: sdk",
      ].join("\n"),
    );
    expect(readme).not.toMatch(/^Status: Draft\nScope:/mu);

    const contextMap = await readFile(path.join(dir, ".agents", "context-map.md"), "utf8");
    expect(contextMap).toContain(
      [
        "- Status: Draft",
        "- Scope: general",
        "- Repository Type: library",
        "- Addons: sdk",
      ].join("\n"),
    );
    expect(contextMap).not.toMatch(/^Status: Draft\nScope:/mu);

    const libraryApi = await readFile(path.join(dir, "docs", "library", "public-api.md"), "utf8");
    expect(libraryApi).toContain(["- Status: Draft", "- Repository Type: library"].join("\n"));
    expect(libraryApi).not.toMatch(/^Status: Draft\nRepository Type:/mu);
  });

  it("skill files include name and description frontmatter", async () => {
    const dir = await scaffold("backend");
    const skill = await readFile(path.join(dir, ".agents", "skills", "backend-api", "SKILL.md"), "utf8");
    expect(skill).toMatch(/^---\nname: backend-api\ndescription:/u);
  });

  it("generates CODEOWNERS as an explicit commented placeholder", async () => {
    const dir = await scaffold("general");
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
      for (const profile of profiles) {
        for (const runner of runners) {
          for (const density of densities) {
            const files = templateFilesFor(scope, runner, profile, density);
            const paths = files.map((file) => file.path);
            expect(new Set(paths).size, `${scope}/${profile}/${runner}/${density}`).toBe(paths.length);
          }
        }
      }
    }
  });

  it("keeps generated Markdown metadata out of collapsible plain paragraphs", () => {
    for (const scope of scopes) {
      for (const density of densities) {
        const cases: Array<{ readonly profile: Profile; readonly addons: readonly Addon[]; readonly label: string }> = [
          ...profiles.map((profile) => ({ profile, addons: [], label: `${scope}/${profile}/${density}` })),
          ...supportedAddons.map((addon) => ({ profile: "generic" as const, addons: [addon], label: `${scope}/generic/${density}+${addon}` })),
        ];

        for (const testCase of cases) {
          const files = templateFilesFor(scope, "none", testCase.profile, density, testCase.addons);
          for (const file of files) {
            if (!file.path.endsWith(".md")) {
              continue;
            }
            expect(adjacentPlainMetadataBlocks(file.content), `${testCase.label}:${file.path}`).toEqual([]);
          }
        }
      }
    }
  });
});
