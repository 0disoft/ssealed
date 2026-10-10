export interface SkillDefinition {
  readonly description: string;
  readonly sources: readonly string[];
  readonly workflow: readonly string[];
}

export function renderSkillDefinition(name: string, skill: SkillDefinition): string {
  const sources = ["AGENTS.md", "VALIDATION.md", "CHECKLIST.md", ".agents/context-map.md", ...skill.sources];
  return `---
name: ${name}
description: ${JSON.stringify(skill.description)}
---

# ${name}

## Read First

${sources.map((source) => `- [${source}](../../../${source})`).join("\n")}

## Work Guidance

${skill.workflow.map((step) => `- ${step}`).join("\n")}

## Validation and Delivery

Use repository rules and the task routes in VALIDATION.md to select relevant configured checks. Repair missing setup within the authorized scope or report the gap; an unconfigured or skipped check is not passing evidence.

Report observable changes, actual checks and results, remaining gaps, and incomplete recovery or delivery work. Follow existing execution and delivery authority; this skill does not authorize additional publication or external mutations.
`;
}
