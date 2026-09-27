const startMarker = "# >>> ssealed ignore patterns >>>";
const endMarker = "# <<< ssealed ignore patterns <<<";

export interface GitignoreManagedBlock {
  readonly start: number;
  readonly end: number;
}

export function findGitignoreManagedBlocks(content: string): readonly GitignoreManagedBlock[] | undefined {
  const blocks: GitignoreManagedBlock[] = [];
  let openStart: number | undefined;
  let offset = 0;

  while (offset < content.length) {
    const nextLf = content.indexOf("\n", offset);
    const nextCr = content.indexOf("\r", offset);
    const lineEnd = Math.min(nextLf < 0 ? content.length : nextLf, nextCr < 0 ? content.length : nextCr);
    const line = content.slice(offset, lineEnd);
    if (line.includes(startMarker) || line.includes(endMarker)) {
      if (line === startMarker) {
        if (openStart !== undefined) {
          return undefined;
        }
        openStart = offset;
      } else if (line === endMarker) {
        if (openStart === undefined) {
          return undefined;
        }
        blocks.push({ start: openStart, end: offset + endMarker.length });
        openStart = undefined;
      } else {
        return undefined;
      }
    }
    offset = lineEnd === content.length ? content.length : lineEnd + (content[lineEnd] === "\r" && content[lineEnd + 1] === "\n" ? 2 : 1);
  }

  return openStart === undefined ? blocks : undefined;
}
