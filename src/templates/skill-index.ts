import type { TemplateFile } from "../core/types.js";

export function renderSkillIndex(files: readonly TemplateFile[]): string {
  const skills = files.filter((file) => file.kind === "agent" && /^\.agents\/skills\/[^/]+\/SKILL\.md$/u.test(file.path));
  if (skills.length === 0) return "";
  const entries = skills.map((file) => {
    const name = file.content.match(/^name: ([^\r\n]+)/mu)?.[1];
    const encodedDescription = file.content.match(/^description: ([^\r\n]+)/mu)?.[1];
    if (name === undefined || encodedDescription === undefined) throw new Error(`Missing agent skill metadata for index: ${file.path}`);
    const description: unknown = JSON.parse(encodedDescription);
    if (typeof description !== "string") throw new Error(`Invalid agent skill description for index: ${file.path}`);
    return `- [${name}](${file.path.slice(".agents/".length)}): ${description}`;
  });
  return `
## Task Skills

Choose the applicable skill by its stated purpose and read its contract sources before editing. This list reflects the skills generated for the selected scope, repository type, addons, and density; it does not grant command or delivery authority. Update the list when the project retires or replaces a skill.

${entries.join("\n")}
`;
}
