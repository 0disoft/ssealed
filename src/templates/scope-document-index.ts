interface DocumentSpec {
  readonly path: string;
  readonly title?: string;
}

export function renderScopeDocumentIndex(filePath: string, files: readonly DocumentSpec[]): string {
  if (!/^docs\/(?:mobile|infra|data)\/README\.md$/u.test(filePath)) return "";
  const prefix = filePath.slice(0, -"README.md".length);
  const documents = files.filter((file) => file.path.startsWith(prefix) && file.path !== filePath && file.path.endsWith(".md"));
  const entries = documents.map((file) => {
    const relativePath = file.path.slice(prefix.length);
    return `- [${file.title ?? relativePath}](${relativePath})`;
  });
  return `
## Decision Documents

${entries.join("\n")}

This map lists the documents selected for this scaffold density. Record decisions here when a dedicated document is absent, and move the detailed authority deliberately when that document is introduced. Update the map when the project retires a document or changes its decision ownership.
`;
}
