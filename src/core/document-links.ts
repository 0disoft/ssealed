import { lstat } from "node:fs/promises";
import path from "node:path";
import { mapWithConcurrency, filesystemReadConcurrency } from "./concurrency.js";
import { assertNoSymlinkInPath, resolveInsideTarget } from "./path-safety.js";

interface DocumentLink {
  readonly path: string;
  readonly line: number;
  readonly target: string;
}

export interface DocumentLinkIssue extends DocumentLink {
  readonly status: "missing" | "unreadable" | "invalid-target";
  readonly reason: string;
  readonly remediation: string;
}

export interface DocumentLinkReport {
  readonly ok: boolean;
  readonly checked: number;
  readonly issues: readonly DocumentLinkIssue[];
}

/** Checks local file destinations, not URL availability or Markdown heading anchors. */
export async function checkDocumentLinks(targetRoot: string, documents: ReadonlyMap<string, string>): Promise<DocumentLinkReport> {
  const links = [...documents].flatMap(([filePath, content]) => localLinks(filePath, content));
  const targets = new Map<string, Promise<Pick<DocumentLinkIssue, "status" | "reason"> | undefined>>();
  const issues = await mapWithConcurrency(links, filesystemReadConcurrency, async (link) => {
    let relativePath: string;
    try {
      const destination = decodeURIComponent(link.target.split(/[?#]/u, 1)[0]!);
      relativePath = path.posix.normalize(destination.startsWith("/")
        ? destination.slice(1)
        : path.posix.join(path.posix.dirname(link.path), destination)).replace(/\/$/u, "") || ".";
      // Never inspect a path outside the target, even when a project document requests it.
      if (relativePath === ".." || relativePath.startsWith("../") || destination.includes("\\")) {
        throw new Error("Link must stay inside the target repository and use forward slashes.");
      }
      if (relativePath !== ".") resolveInsideTarget(targetRoot, relativePath);
    } catch (error: unknown) {
      return { ...link, status: "invalid-target" as const, reason: errorMessage(error),
        remediation: "Use a valid local path inside this repository, or an explicit external URL." };
    }
    let pending = targets.get(relativePath);
    if (pending === undefined) {
      pending = inspectTarget(targetRoot, relativePath);
      targets.set(relativePath, pending);
    }
    const problem = await pending;
    if (problem === undefined) return undefined;
    return { ...link, ...problem, remediation: problem.status === "missing"
      ? "Correct or remove this link. For an untouched generated index, preview update --force before regenerating it; customized documents need a manual edit."
      : "Use a readable regular file or directory inside the repository without symlink components." };
  });
  const failures = issues.filter((issue): issue is DocumentLinkIssue => issue !== undefined);
  return { ok: failures.length === 0, checked: links.length, issues: failures };
}

async function inspectTarget(targetRoot: string, relativePath: string): Promise<Pick<DocumentLinkIssue, "status" | "reason"> | undefined> {
  const absolutePath = relativePath === "." ? path.resolve(targetRoot) : resolveInsideTarget(targetRoot, relativePath);
  try {
    if (relativePath !== ".") await assertNoSymlinkInPath(targetRoot, absolutePath);
    const stat = await lstat(absolutePath);
    if (stat.isSymbolicLink()) return { status: "unreadable", reason: "Refusing a symlinked link target." };
    if (!stat.isFile() && !stat.isDirectory()) return { status: "unreadable", reason: "Link target is not a regular file or directory." };
    return undefined;
  } catch (error: unknown) {
    return { status: isMissing(error) ? "missing" : "unreadable", reason: errorMessage(error) };
  }
}

function localLinks(filePath: string, content: string): DocumentLink[] {
  const links: DocumentLink[] = [];
  let fence: { readonly character: string; readonly length: number } | undefined;
  const comment = { active: false };
  for (const [index, originalLine] of content.split(/\r?\n/u).entries()) {
    const fenceMatch = originalLine.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    if (fence !== undefined) {
      const marker = fenceMatch?.[1];
      if (marker !== undefined && marker[0] === fence.character && marker.length >= fence.length && fenceMatch![2]!.trim() === "") fence = undefined;
      continue;
    }
    if (!comment.active && fenceMatch !== null) {
      const marker = fenceMatch[1]!;
      fence = { character: marker[0]!, length: marker.length };
      continue;
    }
    if (!comment.active && /^(?: {4}|\t)/u.test(originalLine)) continue;
    const line = visibleLine(originalLine, comment);
    const reference = line.match(/^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/u);
    const destinations = reference === null ? inlineDestinations(line) : [reference[1] ?? reference[2]!];
    for (const destination of destinations) {
      const target = destination.replace(/\\([\\()[\]<> ])/gu, "$1");
      if (target === "" || target.startsWith("#") || target.startsWith("?") || target.startsWith("//") || /^[a-z][a-z\d+.-]*:/iu.test(target)) continue;
      links.push({ path: filePath, line: index + 1, target });
    }
  }
  return links;
}

function visibleLine(line: string, comment: { active: boolean }): string {
  let visible = "";
  let index = 0;
  while (index < line.length) {
    if (comment.active) {
      const close = line.indexOf("-->", index);
      if (close === -1) break;
      index = close + 3;
      comment.active = false;
      visible += " ";
    } else if (line.startsWith("<!--", index)) {
      comment.active = true;
      index += 4;
      visible += " ";
    } else if (line[index] === "`") {
      let end = index + 1;
      while (line[end] === "`") end++;
      const marker = line.slice(index, end);
      let close = line.indexOf(marker, end);
      while (close !== -1 && (line[close - 1] === "`" || line[close + marker.length] === "`")) {
        close = line.indexOf(marker, close + marker.length);
      }
      if (close === -1) { visible += marker; index = end; }
      else { visible += " "; index = close + marker.length; }
    } else {
      visible += line[index]!;
      index++;
    }
  }
  return visible;
}

function inlineDestinations(line: string): string[] {
  const targets: string[] = [];
  let brackets = 0;
  for (let index = 0; index < line.length; index++) {
    if (line[index] === "\\") { index++; continue; }
    if (line[index] === "[") { brackets++; continue; }
    if (line[index] !== "]" || brackets === 0) continue;
    brackets--;
    if (line[index + 1] !== "(") continue;
    const destination = inlineDestination(line, index + 2);
    if (destination === undefined) continue;
    targets.push(destination.target);
    index = destination.end;
  }
  return targets;
}

function inlineDestination(line: string, start: number): { readonly target: string; readonly end: number } | undefined {
  let cursor = start;
  while (cursor < line.length && /\s/u.test(line[cursor]!)) cursor++;
  let target: string;
  if (line[cursor] === "<") {
    const end = line.indexOf(">", cursor + 1);
    if (end === -1) return undefined;
    target = line.slice(cursor + 1, end);
    cursor = end + 1;
  } else {
    const begin = cursor;
    let depth = 0;
    while (cursor < line.length) {
      const character = line[cursor]!;
      if (character === "\\") { cursor += 2; continue; }
      if (character === "(") depth++;
      else if (character === ")") { if (depth === 0) break; depth--; }
      else if (/\s/u.test(character) && depth === 0) break;
      cursor++;
    }
    if (depth !== 0) return undefined;
    target = line.slice(begin, cursor);
  }
  const destinationEnd = cursor;
  while (cursor < line.length && /\s/u.test(line[cursor]!)) cursor++;
  if (line[cursor] === ")") return { target, end: cursor };
  if (cursor === destinationEnd) return undefined;
  const opener = line[cursor];
  if (opener !== '"' && opener !== "'" && opener !== "(") return undefined;
  const closer = opener === "(" ? ")" : opener;
  cursor++;
  while (cursor < line.length && line[cursor] !== closer) {
    cursor += line[cursor] === "\\" ? 2 : 1;
  }
  if (cursor >= line.length) return undefined;
  cursor++;
  while (cursor < line.length && /\s/u.test(line[cursor]!)) cursor++;
  return line[cursor] === ")" ? { target, end: cursor } : undefined;
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
