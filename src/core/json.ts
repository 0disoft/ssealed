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
