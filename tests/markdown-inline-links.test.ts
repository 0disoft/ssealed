import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { inlineDestinations } from "../src/core/markdown-inline-links.js";

describe("indexed Markdown destinations", () => {
  it("preserves nested destinations, escapes, titles, and recovery after malformed candidates", () => {
    const cases: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["[bad]([good](README.md)", ["README.md"]],
      ['[x](a "title(with")', ["a"]],
      ["[x](a(b c)d)", ["a(b c)d"]],
      ['[x](<a b> "title")', ["a b"]],
      ["[x](a\\ b)", ["a\\ b"]],
      ['[x](a "title\\"text")', ["a"]],
      ["\\[ignored](missing.md) [ok](README.md)", ["README.md"]],
      ["[x](<unclosed [ok](README.md)", ["README.md"]],
    ];
    for (const [line, targets] of cases) expect(inlineDestinations(line), line).toEqual(targets);
  });

  it("bounds processing of repeated unterminated candidates without dropping a following valid link", async () => {
    // A child deadline can interrupt a synchronous regression; Vitest's own timer cannot.
    const source = new URL("../src/core/markdown-inline-links.ts", import.meta.url).href;
    const script = `
      import { inlineDestinations } from ${JSON.stringify(source)};
      const results = ${JSON.stringify(["[x](", "[x](<", '[x](a "'])}
        .map(prefix => inlineDestinations(prefix.repeat(32768) + "[ok](README.md)"));
      process.stdout.write(JSON.stringify(results));
    `;
    const { stdout } = await promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      encoding: "utf8", timeout: 10000, windowsHide: true,
    });
    expect(JSON.parse(stdout)).toEqual([["README.md"], ["README.md"], ["README.md"]]);
  });
});
