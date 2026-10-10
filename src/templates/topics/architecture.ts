import type { TopicContract } from "./contract.js";

export const architectureTopics: Readonly<Record<string, TopicContract>> = {
  "docs/architecture/00-system-boundary.md": {
    purpose: "Define what this repository is accountable for and what it consumes before choosing components or technologies.",
    source: "docs/product/00-product-brief.md",
    decisions: [
      "Owned responsibilities: UNDECIDED. Map product outcomes to responsibilities owned here, exclusions, and accountable maintainers.",
      "External authority: UNDECIDED. Identify consumed services, contracts, datasets, identities, and decisions owned by other repositories or teams.",
      "Trust crossings: UNDECIDED. Describe inputs, outputs, credentials, and data moving across boundaries, with validation and access-control ownership where applicable.",
      "State authority: UNDECIDED. Name authoritative records, local or derived copies, permitted mutations, and who resolves conflicting state.",
      "Failure containment: UNDECIDED. Explain how an unavailable dependency, partial operation, or compromised component affects other responsibilities.",
      "Boundary changes: UNDECIDED. Define handoff, migration, compatibility, and evidence required before moving a responsibility into or out of this repository.",
    ],
  },
  "docs/architecture/01-domain-model.md": {
    purpose: "Describe the concepts and invariants owned by the product without treating a storage schema or framework model as the domain definition.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Domain vocabulary: UNDECIDED. Define important terms, business meanings, ambiguities, and which owner resolves competing definitions.",
      "Identity and lifecycle: UNDECIDED. Identify entity or value identities, valid states, transitions, and deletion or retention behavior.",
      "Invariants: UNDECIDED. Record uniqueness, relationship, ownership, and state rules that must hold through ordinary work and recovery.",
      "Commands and outcomes: UNDECIDED. Specify who may request a change, its preconditions, resulting facts, and expected business rejections.",
      "Consistency boundaries: UNDECIDED. Define what changes together, what may temporarily diverge, and how conflicting or partial changes are reconciled.",
      "Evolution examples: UNDECIDED. Provide representative valid and invalid scenarios, compatibility rules, and evidence required when meanings or invariants change.",
    ],
  },
  "docs/architecture/02-runtime-flow.md": {
    purpose: "Trace an operation from entry to observable completion and explain the state left behind at each failure or interruption point.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Entry and completion: UNDECIDED. Name the initiating actor, input boundary, validation, completion predicate, and user-visible result.",
      "Execution ownership: UNDECIDED. Map components, asynchronous work, state owners, and the handoff that makes each step accountable.",
      "Effect ordering: UNDECIDED. List reads, mutations, external effects, durable receipts, and result publication in the order they can occur.",
      "Interruption and retry: UNDECIDED. Define cancellation ownership, timeout meaning, duplicate prevention, and what may safely resume or repeat.",
      "Partial state and recovery: UNDECIDED. Identify possible state after each failure, compensation or reconciliation, and unresolved outcomes needing an operator.",
      "Completion evidence: UNDECIDED. Connect the reported result to durable or observable effects and select representative failure and recovery scenarios.",
    ],
  },
  "docs/architecture/03-quality-attributes.md": {
    purpose: "Turn quality goals into measurable scenarios and explicit tradeoffs tied to the product's intended outcomes.",
    source: "docs/product/02-spec.md",
    decisions: [
      "Quality scenarios: UNDECIDED. Describe the user journey, operating conditions, workload, and response expected for each relevant quality attribute.",
      "Measurement contract: UNDECIDED. Define the metric, population, denominator, observation point, window, and owner needed to evaluate a scenario.",
      "Thresholds and tradeoffs: UNDECIDED. Set justified targets or limits, state the cost of meeting them, and identify competing goals.",
      "Failure envelopes: UNDECIDED. Record behavior under exhausted resources, unavailable dependencies, abnormal input, and degraded operation.",
      "Evidence and gaps: UNDECIDED. Select representative measurements or checks, distinguish measured results from assumptions, and disclose untested conditions.",
      "Review triggers: UNDECIDED. Assign review authority and revisit targets when workloads, costs, supported environments, or product expectations change.",
    ],
  },
  "ARCHITECTURE.md": {
    purpose: "Orient a new contributor to the architecture decisions and their authoritative documents without duplicating every detailed contract.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Architecture map: UNDECIDED. Summarize major responsibilities and point readers to the boundary, domain, runtime, and quality documents that own the details.",
      "Decision status: UNDECIDED. Distinguish accepted decisions, alternatives under consideration, unresolved assumptions, and related decision records.",
      "Technology rationale: UNDECIDED. Explain chosen or proposed technologies, relevant constraints, alternatives, and replacement or exit assumptions.",
      "Contract handoffs: UNDECIDED. Identify external owners, shared interfaces, and coordination needed when responsibilities or compatibility change.",
      "Change impact: UNDECIDED. Define which documents, consumers, checks, and recovery plans must be reviewed for a structural change.",
      "Map maintenance: UNDECIDED. Name the owner and update triggers that keep this overview aligned with accepted decisions and current implementation.",
    ],
  },
};
