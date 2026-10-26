type Delimiter = "'" | '"' | ")" | ">";

/** Shared suffix information prevents failed link candidates from rescanning a line. */
class InlineIndex {
  readonly targetEnds: Uint32Array;
  readonly whitespaceEnds: Uint32Array;
  private readonly delimiters: Record<Delimiter, number[]> = { "'": [], '"': [], ")": [], ">": [] };

  constructor(line: string) {
    const length = line.length;
    const escaped = new Uint8Array(length);
    let escapeNext = false;
    for (let index = 0; index < length; index++) {
      const character = line[index]!;
      // Angle destinations historically end at the next >, including an escaped >.
      if (character === ">") this.delimiters[">"].push(index);
      if (escapeNext) { escaped[index] = 1; escapeNext = false; continue; }
      if (character === "\\") { escapeNext = true; continue; }
      if (character === "'" || character === '"' || character === ")") this.delimiters[character].push(index);
    }

    this.targetEnds = new Uint32Array(length + 1);
    this.whitespaceEnds = new Uint32Array(length + 1);
    this.targetEnds[length] = length;
    this.whitespaceEnds[length] = length;
    const closingParentheses: number[] = [];
    for (let index = length - 1; index >= 0; index--) {
      const character = line[index]!;
      const whitespace = /\s/u.test(character);
      this.whitespaceEnds[index] = whitespace ? this.whitespaceEnds[index + 1]! : index;
      if (!escaped[index] && character === ")") {
        closingParentheses.push(index);
        this.targetEnds[index] = index;
      } else if (!escaped[index] && character === "(") {
        const close = closingParentheses.pop();
        this.targetEnds[index] = close === undefined ? length : this.targetEnds[close + 1]!;
      } else if (!escaped[index] && character === "\\") {
        this.targetEnds[index] = this.targetEnds[Math.min(index + 2, length)]!;
      } else {
        this.targetEnds[index] = whitespace ? index : this.targetEnds[index + 1]!;
      }
    }
  }

  next(delimiter: Delimiter, start: number, fallback: number): number {
    const positions = this.delimiters[delimiter];
    let low = 0;
    let high = positions.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (positions[middle]! < start) low = middle + 1;
      else high = middle;
    }
    return positions[low] ?? fallback;
  }
}

export function inlineDestinations(line: string): string[] {
  if (!line.includes("](")) return [];
  const lookup = new InlineIndex(line);
  const targets: string[] = [];
  let brackets = 0;
  for (let index = 0; index < line.length; index++) {
    if (line[index] === "\\") { index++; continue; }
    if (line[index] === "[") { brackets++; continue; }
    if (line[index] !== "]" || brackets === 0) continue;
    brackets--;
    if (line[index + 1] !== "(") continue;
    const destination = inlineDestination(line, index + 2, lookup);
    if (destination === undefined) continue;
    targets.push(destination.target);
    index = destination.end;
  }
  return targets;
}

function inlineDestination(line: string, start: number, lookup: InlineIndex): { readonly target: string; readonly end: number } | undefined {
  let cursor = lookup.whitespaceEnds[start] ?? line.length;
  let targetStart = cursor;
  let targetEnd: number;
  if (line[cursor] === "<") {
    targetStart++;
    targetEnd = lookup.next(">", targetStart, line.length);
    if (targetEnd === line.length) return undefined;
    cursor = targetEnd + 1;
  } else {
    targetEnd = lookup.targetEnds[cursor] ?? line.length;
    if (targetEnd === line.length) return undefined;
    cursor = targetEnd;
  }
  const destinationEnd = cursor;
  cursor = lookup.whitespaceEnds[cursor] ?? line.length;
  if (line[cursor] !== ")") {
    if (cursor === destinationEnd) return undefined;
    const opener = line[cursor];
    if (opener !== '"' && opener !== "'" && opener !== "(") return undefined;
    const closer = opener === "(" ? ")" : opener;
    const titleEnd = lookup.next(closer, cursor + 1, line.length);
    cursor = lookup.whitespaceEnds[titleEnd + 1] ?? line.length;
    if (line[cursor] !== ")") return undefined;
  }
  return { target: line.slice(targetStart, targetEnd), end: cursor };
}
