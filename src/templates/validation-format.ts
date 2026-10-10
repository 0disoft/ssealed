import { documentMetadata } from "./document-format.js";

export interface ValidationDefinition {
  readonly sources: readonly string[];
  readonly purpose: string;
  readonly evidence: readonly string[];
  readonly validations: readonly string[];
}

export function renderValidationDefinition(title: string, validation: ValidationDefinition): string {
  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Source of Truth

${["VALIDATION.md", ...validation.sources].map((source) => `- [${source}](../../${source})`).join("\n")}

## Validation Scope

${validation.purpose}

## Validation Selection

- Relevant validation names: ${validation.validations.join(", ")}
- Stable names and executable routing come from root VALIDATION.md and the configured runner. Do not infer commands from this guide.
- Select checks for affected contracts and failure paths. Review-only changes may use focused document or contract review; scaffold text does not prove implemented runtime behavior.
- Unconfigured or skipped checks require reasons and remaining risk; they are not passing evidence.

## Required Evidence

${validation.evidence.map((item) => `- ${item}`).join("\n")}

## Report

Record the affected contract, artifact and environment where relevant, executed checks, actual results, skipped checks and reasons, and remaining work or risk.
Distinguish planned, delivered, active, and completed state where relevant. This guide does not authorize deployment or additional external effects.
`;
}
