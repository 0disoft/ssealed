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
  const lineEndings = /\r\n|[\r\n]/gu;

  while (offset < content.length) {
    // Search for either line ending once, including when the other kind is absent.
    const ending = lineEndings.exec(content);
    const lineEnd = ending?.index ?? content.length;
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
    offset = ending === null ? content.length : lineEndings.lastIndex;
  }

  return openStart === undefined ? blocks : undefined;
}
