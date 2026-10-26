import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";
import { checkDocumentLinks } from "../src/core/document-links.js";

const workdirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(workdirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ssealed-links-"));
  workdirs.push(dir);
  return dir;
}

async function command(args: string[]): Promise<{ code: number; payload: any }> {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    const code = await main([...args, "--json"]);
    return { code, payload: JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")) };
  } finally { stdout.mockRestore(); }
}

describe("local document links", () => {
  it("resolves relative, root-relative, encoded and reference destinations without checking URLs or examples", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, "docs"));
    await writeFile(path.join(dir, "README.md"), "# Root\n");
    await writeFile(path.join(dir, "docs", "with space(1).md"), "# Page\n");
    const content = [
      '[root](../README.md#heading "Root")',
      '[absolute](/README.md?view=1)',
      '[encoded](with%20space%281%29.md)',
      '[angle](<with space(1).md>)',
      '[balanced](with%20space(1).md)',
      '[reference]: ../README.md "Root"',
      '[directory](../)',
      '[external](https://example.invalid/not-checked) [mail](mailto:test@example.invalid)',
      '[anchor](#heading) [query](?view=1) [protocol](//example.invalid/page)',
      '`[example](missing-inline.md)`',
      '```md', '[example](missing-fenced.md)', '```',
      '    [example](missing-indented.md)',
      '<!-- [comment](missing-comment.md) -->',
      '\\[escaped](missing-escaped.md) ](missing-no-label.md)',
      '[titled](../README.md "[example](missing-title.md)")',
      '[invalid](missing-invalid.md unquoted title)',
      '```html', '<!--', '```',
      '[after-fence](../README.md)',
      '`<!--` [after-inline](../README.md)',
      '<!--', '[hidden](missing-comment-block.md)', '-->',
    ].join("\n");
    const report = await checkDocumentLinks(dir, new Map([["docs/page.md", content]]));
    expect(report).toEqual({ ok: true, checked: 10, issues: [] });
  });

  it("reports missing destinations with their source line and a repair instruction", async () => {
    const dir = await tempDir();
    const report = await checkDocumentLinks(dir, new Map([["docs/page.md", "# Draft\n\n[missing](gone.md#topic)\n"]]));
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([expect.objectContaining({ path: "docs/page.md", line: 3, target: "gone.md#topic", status: "missing", remediation: expect.stringContaining("Correct or remove") })]);
  });

  it("rejects traversal and malformed encoded paths instead of inspecting outside the repository", async () => {
    const dir = await tempDir();
    const report = await checkDocumentLinks(dir, new Map([["README.md", "[escape](../outside.md)\n[encoded](%2e%2e/outside.md)\n[bad](bad%path.md)\n[windows](..\\\\outside.md)\n"]]));
    expect(report.checked).toBe(4);
    expect(report.issues.map((issue) => issue.status)).toEqual(Array(4).fill("invalid-target"));
  });

  it("refuses symlinked target components", async () => {
    const dir = await tempDir();
    const outside = await tempDir();
    await writeFile(path.join(outside, "page.md"), "# Outside\n");
    await symlink(outside, path.join(dir, "linked"), process.platform === "win32" ? "junction" : "dir");
    const report = await checkDocumentLinks(dir, new Map([["README.md", "[outside](linked/page.md)\n"]]));
    expect(report.issues).toEqual([expect.objectContaining({ status: "unreadable", reason: expect.stringContaining("symlink") })]);
  });

  it("optionally diagnoses a retired skill without changing lifecycle checks or repository files", async () => {
    const dir = await tempDir();
    expect((await command(["init", dir, "--scope", "general", "--yes"])).code).toBe(0);
    await unlink(path.join(dir, ".agents", "skills", "feature", "SKILL.md"));
    expect((await command(["update", dir])).code).toBe(0);
    const contextPath = path.join(dir, ".agents", "context-map.md");
    const before = await readFile(contextPath, "utf8");
    const manifestBefore = await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8");
    const lifecycle = await command(["doctor", dir, "--strict"]);
    expect(lifecycle.code).toBe(0);
    expect(lifecycle.payload).not.toHaveProperty("links");
    const diagnostic = await command(["doctor", dir, "--strict", "--links"]);
    expect(diagnostic.code).toBe(1);
    expect(diagnostic.payload.ok).toBe(false);
    expect(diagnostic.payload.links.issues).toContainEqual(expect.objectContaining({ path: ".agents/context-map.md", target: "skills/feature/SKILL.md", status: "missing" }));
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      expect(await main(["doctor", dir, "--links"])).toBe(1);
      const output = stdout.mock.calls.map(([chunk]) => String(chunk)).join("");
      expect(output).toMatch(/\.agents\/context-map\.md:\d+ -> skills\/feature\/SKILL\.md/u);
      expect(output).toContain("Fix: Correct or remove this link.");
    } finally { stdout.mockRestore(); }
    expect(await readFile(contextPath, "utf8")).toBe(before);
    expect(await readFile(path.join(dir, ".ssealed", "manifest.json"), "utf8")).toBe(manifestBefore);
    expect((await command(["update", dir, "--force"])).code).toBe(0);
    const repaired = await command(["doctor", dir, "--links"]);
    expect(repaired.code).toBe(0);
    expect(repaired.payload.links).toMatchObject({ ok: true, issues: [] });
  });
});
