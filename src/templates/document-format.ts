export function documentMetadata(entries: ReadonlyArray<readonly [string, string]>): string {
  return entries.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}
