import { createHash } from "node:crypto";

export function normalizeText(content: string): string {
  const normalized = content.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
}

export function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(normalizeText(content), "utf8").digest("hex")}`;
}
