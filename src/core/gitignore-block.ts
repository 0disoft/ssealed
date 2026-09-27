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
    const newline = content.indexOf("\n", offset);
    const lineEnd = newline < 0 ? content.length : newline;
    const line = content.slice(offset, lineEnd).replace(/\r$/u, "");
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
    offset = newline < 0 ? content.length : newline + 1;
  }

  return openStart === undefined ? blocks : undefined;
}
