import type { TemplateFile } from "../core/types.js";

export function renderChecklistIndex(files: readonly TemplateFile[]): string {
  const checklists = files.filter((file) => file.kind === "checklist" && file.path.startsWith(".agents/checklists/"));
  if (checklists.length === 0) return "";
  const entries = checklists.map((file) => {
    const title = file.content.match(/^# ([^\r\n]+)/u)?.[1] ?? file.path;
    return `- [${title}](${file.path})`;
  });
  return `
## Task Checklists

This list reflects the checklists generated for the selected scope, repository type, addons, and density. Select applicable items and record evidence, unresolved choices, and reasons for skipped or inapplicable checks. Update the list when the project retires or replaces a checklist.

${entries.join("\n")}
`;
}
