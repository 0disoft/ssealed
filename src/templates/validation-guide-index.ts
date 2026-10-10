import type { TemplateFile } from "../core/types.js";

export function renderValidationGuideIndex(files: readonly TemplateFile[]): string {
  const guides = files.filter((file) => file.kind === "validation" && file.path.startsWith(".agents/validations/"));
  if (guides.length === 0) return "";
  const entries = guides.map((file) => {
    const title = file.content.match(/^# ([^\r\n]+)/u)?.[1] ?? file.path;
    return `- [${title}](${file.path})`;
  });
  return `
## Task Validation Guides

Select the relevant guide for affected contracts and failure paths. This list reflects the guides generated for the selected scope, repository type, addons, and density. Stable names and runner routing remain governed by this document. Update the list when the project retires or replaces a guide.

${entries.join("\n")}
`;
}
