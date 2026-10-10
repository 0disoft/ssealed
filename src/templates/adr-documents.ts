import { documentMetadata } from "./document-format.js";

interface DecisionRecord {
  readonly purpose: string;
  readonly context: readonly string[];
  readonly decision: readonly string[];
  readonly alternatives: readonly string[];
  readonly consequences: readonly string[];
  readonly verification: readonly string[];
}

const decisionRecords: Readonly<Record<string, DecisionRecord>> = {
  "docs/adr/0000-template.md": {
    purpose: "Copy this template for a consequential architecture decision. Record the evidence and tradeoffs that explain the choice to future maintainers.",
    context: [
      "Problem and evidence: UNDECIDED; describe the observed problem, affected users or systems, and supporting facts.",
      "Constraints: UNDECIDED; record requirements, operating limits, and assumptions that constrain the choice.",
      "Decision scope: UNDECIDED; identify affected contracts, owners, and exclusions.",
    ],
    decision: [
      "Chosen option: UNDECIDED; describe the proposed behavior and why it satisfies the constraints.",
      "Rationale: UNDECIDED; connect the choice to evidence and explain which tradeoffs are acceptable.",
      "Authority: UNDECIDED; identify the project owner who records the decision and its date.",
    ],
    alternatives: [
      "Do nothing: UNDECIDED; explain the outcome and cost of keeping the current approach.",
      "Other viable options: UNDECIDED; compare benefits, costs, and rejection reasons using the same criteria.",
    ],
    consequences: [
      "Benefits and costs: UNDECIDED; record expected gains, new responsibilities, and ongoing maintenance.",
      "Risks and migration: UNDECIDED; explain compatibility changes, failure cases, and transition work.",
      "Reversibility: UNDECIDED; identify what can be undone and what requires recovery or another decision.",
      "Revisit trigger: UNDECIDED; name measurable conditions that would justify changing this decision.",
    ],
    verification: [
      "Decision evidence: UNDECIDED; link the comparison, prototype, measurements, or review that supports the choice.",
      "Implementation evidence: UNDECIDED; define observable acceptance criteria and link completed checks when available.",
      "Follow-up work: UNDECIDED; assign each remaining action an owner and completion condition.",
    ],
  },
  "docs/adr/0001-initial-architecture-boundaries.md": {
    purpose: "Draft the initial ownership and interaction boundaries from the product needs. This seeded record does not select an architecture for the project.",
    context: [
      "Product constraints: UNDECIDED; link the relevant outcomes and requirements in [Product Specification](../product/02-spec.md).",
      "Owned responsibilities: UNDECIDED; identify capabilities, state, and invariants this repository must own.",
      "External authority: UNDECIDED; identify other owners and contracts that this repository consumes.",
    ],
    decision: [
      "Proposed boundaries: UNDECIDED; map responsibilities to components and name each owner.",
      "Trust crossings: UNDECIDED; describe exchanged data, caller authority, validation, and effect ownership.",
      "Boundary rationale: UNDECIDED; explain cohesion, dependency direction, and reasons for separating responsibilities.",
    ],
    alternatives: [
      "Centralized ownership: UNDECIDED; compare a single owner with the proposed boundaries.",
      "Different boundary placement: UNDECIDED; compare another split and its coordination and operating costs.",
    ],
    consequences: [
      "Failure containment: UNDECIDED; record failure propagation, interruption, retry, and recovery responsibilities.",
      "Handoffs and migration: UNDECIDED; describe compatibility, state transfer, and changes required of external owners.",
      "Boundary review trigger: UNDECIDED; identify growth or failure evidence that would justify changing the split.",
    ],
    verification: [
      "Boundary evidence: UNDECIDED; demonstrate a representative success and failure flow across the proposed boundaries.",
      "Documentation alignment: UNDECIDED; keep [System Boundary](../architecture/00-system-boundary.md) and [Architecture](../../ARCHITECTURE.md) aligned with the recorded decision.",
      "Implementation follow-up: UNDECIDED; name remaining contract changes, owners, and observable completion criteria.",
    ],
  },
  "docs/adr/0002-contract-source-of-truth.md": {
    purpose: "Draft where each contract fact is authoritative and how derived consumers stay aligned. This seeded record does not designate project-specific sources.",
    context: [
      "Contract inventory: UNDECIDED; list contract facts, existing representations, owners, and affected consumers.",
      "Current disagreement: UNDECIDED; record duplication or conflicting behavior and the evidence showing its impact.",
      "Compatibility constraints: UNDECIDED; identify consumers and versions that must continue working.",
    ],
    decision: [
      "Canonical authority: UNDECIDED; designate one authoritative source and owner for each contract fact.",
      "Derived consumers: UNDECIDED; identify generated or manually maintained copies and their update direction.",
      "Conflict resolution: UNDECIDED; explain how conflicting representations are resolved without accepting a derived copy as authority.",
    ],
    alternatives: [
      "Keep separate definitions: UNDECIDED; compare coordination costs and the likelihood of divergent changes.",
      "Shared schema or generation: UNDECIDED; compare tooling cost, compatibility, and limits against explicit manual synchronization.",
    ],
    consequences: [
      "Update responsibilities: UNDECIDED; identify who changes authority and synchronizes each consumer.",
      "Migration and compatibility: UNDECIDED; define the transition order, affected consumers, and recovery if adoption fails.",
      "Authority review trigger: UNDECIDED; identify when a new consumer or contract change requires revisiting this decision.",
    ],
    verification: [
      "Drift detection: UNDECIDED; define a check that detects disagreement between the authoritative fact and its consumers.",
      "Compatibility evidence: UNDECIDED; verify representative consumers and link the observed behavior.",
      "Follow-up work: UNDECIDED; assign synchronization and migration tasks with completion criteria.",
    ],
  },
};

export function renderAdrDocument(filePath: string, title: string): string | undefined {
  if (filePath === "docs/adr/README.md") return adrIndex(title);
  const record = decisionRecords[filePath];
  if (record === undefined) return undefined;
  const sections: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["Context", record.context],
    ["Decision", record.decision],
    ["Alternatives", record.alternatives],
    ["Consequences", record.consequences],
    ["Verification", [...record.verification, "Validation routing: [VALIDATION.md](../../VALIDATION.md); record the actual checks and results rather than assuming a draft is implemented."]],
  ];
  return `# ${title}

${documentMetadata([
  ["Status", "Draft"],
  ["Owner", "UNASSIGNED"],
  ["Decision date", "UNDECIDED"],
  ["Supersedes", "UNDECIDED"],
  ["Superseded by", "UNDECIDED"],
])}

${record.purpose}

${sections.map(([heading, entries]) => `## ${heading}\n\n${entries.map((entry) => `- ${entry}`).join("\n")}`).join("\n\n")}

## Lifecycle

- Keep this record Draft until the project owner records a dated decision and its rationale. Use Accepted or Rejected to record the outcome.
- Acceptance does not prove implementation; keep implementation evidence and follow-up work separate from decision status.
- For a material change to an accepted decision, create a new numbered ADR, mark the prior record Superseded, link both records, and preserve the previous rationale.
- Record dated amendments and update the status and links in the [ADR index](README.md).
`;
}

function adrIndex(title: string): string {
  return `# ${title}

${documentMetadata([["Status", "Draft"], ["Owner", "UNASSIGNED"]])}

## Decision Records

The generated records are draft prompts, not accepted architecture decisions. Fill them with project evidence and explicit choices before recording an outcome.

| Record | Status | Owner | Decision date | Superseded by |
| --- | --- | --- | --- | --- |
| [Initial Architecture Boundaries](0001-initial-architecture-boundaries.md) | Draft | UNASSIGNED | UNDECIDED | UNDECIDED |
| [Contract Source of Truth](0002-contract-source-of-truth.md) | Draft | UNASSIGNED | UNDECIDED | UNDECIDED |

## Recording a Decision

- Copy the [ADR template](0000-template.md) to the next unused numbered filename; the template itself is not a project decision.
- Give each record a clear decision scope, owner, context, chosen option, alternatives, consequences, and verification evidence.
- Keep new records Draft while evaluating options. Record Accepted or Rejected with a date and rationale, then update this index from the individual records.
- Acceptance does not prove implementation. Track implementation evidence and remaining work in the record and route checks through [VALIDATION.md](../../VALIDATION.md).

## Changing a Decision

- Amend drafts as evidence changes. Record dated clarifications to accepted decisions without hiding their original context.
- For a material change, create a new ADR, mark the prior record Superseded, link both records, and preserve the previous rationale.
- Keep the individual records authoritative for status, rationale, and supersession; update this index and the affected architecture or contract documents to match.
`;
}
