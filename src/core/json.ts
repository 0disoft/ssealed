const utf8Bom = "\uFEFF";

export function parseJsonObject(content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(content.startsWith(utf8Bom) ? content.slice(1) : content);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function preserveJsonBom(originalContent: string, nextContent: string): string {
  return originalContent.startsWith(utf8Bom) && !nextContent.startsWith(utf8Bom) ? `${utf8Bom}${nextContent}` : nextContent;
}

interface JsonValueRange {
  readonly start: number;
  readonly end: number;
}

// Callers validate the JSON object first. These helpers locate tokens without
// round-tripping unrelated values through JavaScript's number representation.
export function findJsonObjectProperty(content: string, name: string): JsonValueRange | undefined {
  return locateJsonObjectProperty(content, name).range;
}

export function findJsonArrayElement(content: string, index: number): JsonValueRange | undefined {
  if (!Number.isInteger(index) || index < 0) return undefined;
  let offset = skipJsonWhitespace(content, 0);
  if (content[offset] !== "[") throw new Error("Expected a validated JSON array.");
  offset++;
  for (let current = 0; offset < content.length; current++) {
    const start = skipJsonWhitespace(content, offset);
    if (content[start] === "]") return undefined;
    const end = scanJsonValue(content, start);
    if (current === index) return { start, end };
    offset = skipJsonWhitespace(content, end);
    if (content[offset] === ",") offset++;
  }
  return undefined;
}

export function removeJsonObjectProperty(content: string, name: string): string {
  const opening = skipJsonWhitespace(content, content.startsWith(utf8Bom) ? 1 : 0);
  if (content[opening] !== "{") throw new Error("Expected a validated JSON object.");
  let offset = opening + 1;
  let removed = false;
  const retained: string[] = [];
  while (offset < content.length) {
    const memberStart = offset;
    offset = skipJsonWhitespace(content, offset);
    if (content[offset] === "}") {
      return removed ? `${content.slice(0, opening + 1)}${retained.join(",")}${content.slice(offset)}` : content;
    }
    const keyEnd = scanJsonString(content, offset);
    const key: unknown = JSON.parse(content.slice(offset, keyEnd));
    offset = skipJsonWhitespace(content, keyEnd);
    if (content[offset] !== ":") throw new Error("Expected a validated JSON property.");
    const end = scanJsonValue(content, skipJsonWhitespace(content, offset + 1));
    offset = skipJsonWhitespace(content, end);
    if (key === name) removed = true;
    else retained.push(content.slice(memberStart, offset));
    if (content[offset] === ",") offset++;
  }
  throw new Error("Could not locate the end of a validated JSON object.");
}

export function setJsonObjectProperty(content: string, name: string, serializedValue: string, indent: string | number = 0): string {
  const property = locateJsonObjectProperty(content, name);
  if (property.range !== undefined) {
    return `${content.slice(0, property.range.start)}${serializedValue}${content.slice(property.range.end)}`;
  }
  const unit = typeof indent === "number" ? " ".repeat(indent) : indent.slice(0, 10);
  const separator = unit.length > 0 ? `\n${unit}` : "";
  const value = serializedValue.replace(/\n/gu, `\n${unit}`);
  const entry = `${property.hasMembers ? "," : ""}${separator}${JSON.stringify(name)}:${unit.length > 0 ? " " : ""}${value}`;
  return `${content.slice(0, property.insertAt)}${entry}${content.slice(property.insertAt)}`;
}

function locateJsonObjectProperty(content: string, name: string): {
  readonly range: JsonValueRange | undefined;
  readonly insertAt: number;
  readonly hasMembers: boolean;
} {
  let offset = skipJsonWhitespace(content, content.startsWith(utf8Bom) ? 1 : 0);
  if (content[offset] !== "{") throw new Error("Expected a validated JSON object.");
  let insertAt = ++offset;
  let hasMembers = false;
  let range: JsonValueRange | undefined;
  while (offset < content.length) {
    offset = skipJsonWhitespace(content, offset);
    if (content[offset] === "}") return { range, insertAt, hasMembers };
    const keyEnd = scanJsonString(content, offset);
    const key: unknown = JSON.parse(content.slice(offset, keyEnd));
    offset = skipJsonWhitespace(content, keyEnd);
    if (content[offset] !== ":") throw new Error("Expected a validated JSON property.");
    const start = skipJsonWhitespace(content, offset + 1);
    const end = scanJsonValue(content, start);
    // JSON.parse uses the last occurrence of a duplicate property.
    if (key === name) range = { start, end };
    insertAt = end;
    hasMembers = true;
    offset = skipJsonWhitespace(content, end);
    if (content[offset] === ",") offset++;
  }
  throw new Error("Could not locate the end of a validated JSON object.");
}

function skipJsonWhitespace(content: string, offset: number): number {
  while (offset < content.length && /[ \t\r\n]/u.test(content[offset] as string)) offset++;
  return offset;
}

function scanJsonString(content: string, start: number): number {
  if (content[start] !== '"') throw new Error("Expected a validated JSON string.");
  for (let offset = start + 1; offset < content.length; offset++) {
    if (content[offset] === "\\") offset++;
    else if (content[offset] === '"') return offset + 1;
  }
  throw new Error("Could not locate the end of a validated JSON string.");
}

function scanJsonValue(content: string, start: number): number {
  if (content[start] === '"') return scanJsonString(content, start);
  if (content[start] !== "{" && content[start] !== "[") {
    let offset = start;
    while (offset < content.length && !/[,}\] \t\r\n]/u.test(content[offset] as string)) offset++;
    return offset;
  }
  let depth = 1;
  for (let offset = start + 1; offset < content.length; offset++) {
    const character = content[offset];
    if (character === '"') offset = scanJsonString(content, offset) - 1;
    else if (character === "{" || character === "[") depth++;
    else if ((character === "}" || character === "]") && --depth === 0) return offset + 1;
  }
  throw new Error("Could not locate the end of a validated JSON value.");
}
