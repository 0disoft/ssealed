import { describe, expect, it } from "vitest";
import { findGitignoreManagedBlocks } from "../src/core/gitignore-block.js";

const start = "# >>> ssealed ignore patterns >>>";
const end = "# <<< ssealed ignore patterns <<<";

describe("gitignore managed block boundaries", () => {
  it.each(["\n", "\r", "\r\n"])("keeps exact block offsets with %j line endings", (newline) => {
    const prefix = `custom.local${newline}${newline}`;
    const block = `${start}${newline}node_modules/${newline}${end}`;
    for (const suffix of ["", `${newline}other.local${newline}`]) {
      const content = prefix + block + suffix;
      const blocks = findGitignoreManagedBlocks(content);
      expect(blocks).toEqual([{ start: prefix.length, end: prefix.length + block.length }]);
      expect(content.slice(blocks![0]!.start, blocks![0]!.end)).toBe(block);
    }
  });

  it("handles mixed line endings and multiple complete blocks without joining adjacent lines", () => {
    const first = `${start}\rnode_modules/\r\n${end}`;
    const second = `${start}\n.env\r${end}`;
    const content = `custom.local\r\n${first}\n\r${second}`;
    expect(findGitignoreManagedBlocks(content)?.map((block) => content.slice(block.start, block.end)))
      .toEqual([first, second]);
  });

  it.each([
    `${start}\n${start}\n${end}`,
    `${end}\r\n`,
    `${start}\rnode_modules/`,
    ` ${start}\n${end}`,
    `${start}\n${end} extra`,
  ])("rejects malformed markers in %j", (content) => {
    expect(findGitignoreManagedBlocks(content)).toBeUndefined();
  });

  it.each(["\n", "\r"])("finds a block after a large project-owned prefix using %j", (newline) => {
    const prefix = `# existing project ignore pattern${newline}`.repeat(80_000);
    const block = `${start}${newline}.ssealed-init.lock${newline}${end}`;
    expect(findGitignoreManagedBlocks(prefix + block)).toEqual([
      { start: prefix.length, end: prefix.length + block.length },
    ]);
    expect(findGitignoreManagedBlocks(prefix)).toEqual([]);
  });
});
