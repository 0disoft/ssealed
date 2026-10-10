import { documentMetadata } from "./document-format.js";

export interface ChecklistDefinition {
  readonly sources: readonly string[];
  readonly failureModes: string;
  readonly items: readonly string[];
  readonly validations: readonly string[];
}

export function renderChecklistDefinition(title: string, checklist: ChecklistDefinition): string {
  const sources = ["AGENTS.md", "VALIDATION.md", ...checklist.sources];
  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Source of Truth

${sources.map((source) => `- [${source}](../../${source})`).join("\n")}

## Failure Modes

${checklist.failureModes}

## Checklist

Complete applicable items only with evidence. Record unresolved choices and the reason for any skipped or inapplicable item.

${checklist.items.map((item) => `- [ ] ${item}`).join("\n")}

## Validation

- Relevant validation names: ${checklist.validations.join(", ")}
- Select configured checks from VALIDATION.md for the affected contracts and failure paths.
- Report skipped or unconfigured checks with reasons and remaining risk; they are not passing evidence.
`;
}
