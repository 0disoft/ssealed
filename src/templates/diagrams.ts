import type { Scope } from "../core/types.js";
import { documentMetadata } from "./document-format.js";

interface DiagramDefinition {
  readonly source: string;
  readonly question: string;
  readonly graph: string;
}

const definitions: Readonly<Record<string, DiagramDefinition>> = {
  "diagrams/system-context.mmd": {
    source: "docs/architecture/00-system-boundary.md",
    question: "Which actors and external systems interact with the owned system?",
    graph: `flowchart LR
  Actor["External actor: UNDECIDED"]
  System["Owned system: UNDECIDED"]
  External["External system: UNDECIDED"]
  Actor -->|Intent and input: UNDECIDED| System
  System -->|Observable outcome: UNDECIDED| Actor
  System -->|Consumed contract: UNDECIDED| External
  External -->|Data and failure contract: UNDECIDED| System`,
  },
  "diagrams/container-view.mmd": {
    source: "ARCHITECTURE.md",
    question: "Which components own entry, core behavior, state, and external integration?",
    graph: `flowchart LR
  Entry["Entry component: UNDECIDED"]
  Core["Core component: UNDECIDED"]
  State["State owner: UNDECIDED"]
  Adapter["Integration component: UNDECIDED"]
  Entry -->|Validated contract: UNDECIDED| Core
  Core -->|Read or mutation authority: UNDECIDED| State
  State -->|State result: UNDECIDED| Core
  Core -->|External contract handoff: UNDECIDED| Adapter
  Adapter -->|Outcome and failure: UNDECIDED| Core`,
  },
  "diagrams/core-runtime-flow.mmd": {
    source: "docs/architecture/02-runtime-flow.md",
    question: "How does an operation reach observable completion or recover from partial effects?",
    graph: `flowchart TD
  Input["Operation input: UNDECIDED"] -->|Validate: UNDECIDED| Valid{"Preconditions satisfied: UNDECIDED"}
  Valid -->|No: UNDECIDED| Rejected["Rejected input: UNDECIDED"]
  Valid -->|Yes: UNDECIDED| Effect["Owned effect: UNDECIDED"]
  Effect -->|Observe durable state: UNDECIDED| Complete{"Completion predicate: UNDECIDED"}
  Complete -->|Satisfied: UNDECIDED| Result["Reported result: UNDECIDED"]
  Effect -->|Failure or interruption: UNDECIDED| Partial["Partial or unknown outcome: UNDECIDED"]
  Complete -->|Unconfirmed: UNDECIDED| Partial
  Partial -->|Reconcile within deadline: UNDECIDED| Recovery["Recovery owner: UNDECIDED"]
  Recovery -->|Record resolved or unresolved state: UNDECIDED| Report["Recovery report: UNDECIDED"]`,
  },
  "diagrams/release-flow.mmd": {
    source: "docs/ops/release.md",
    question: "Which evidence permits promotion, and what happens if release health is unacceptable?",
    graph: `flowchart TD
  Candidate["Candidate artifact: UNDECIDED"] -->|Verify identity and compatibility: UNDECIDED| Ready{"Release criteria met: UNDECIDED"}
  Ready -->|No: UNDECIDED| Hold["Held release: UNDECIDED"]
  Ready -->|Yes: UNDECIDED| Promote["Promotion: UNDECIDED"]
  Promote -->|Observe rollout: UNDECIDED| Health{"Health window passed: UNDECIDED"}
  Health -->|Yes: UNDECIDED| Published["Release outcome: UNDECIDED"]
  Health -->|No or unknown: UNDECIDED| Recover["Recovery decision: UNDECIDED"]
  Promote -->|Partial failure: UNDECIDED| Recover
  Recover -->|Execute selected recovery: UNDECIDED| Evidence["Recovery evidence: UNDECIDED"]`,
  },
  "diagrams/rollback-flow.mmd": {
    source: "docs/ops/rollback.md",
    question: "Can the observed state be reversed safely, or does it require forward recovery?",
    graph: `flowchart TD
  Incident["Observed failed state: UNDECIDED"] -->|Identify artifact and data state: UNDECIDED| Target["Recovery target: UNDECIDED"]
  Target -->|Check compatibility and side effects: UNDECIDED| Reversible{"Reversible: UNDECIDED"}
  Reversible -->|Yes: UNDECIDED| Restore["Restore compatible state: UNDECIDED"]
  Reversible -->|No or unknown: UNDECIDED| Forward["Reconcile or compensate: UNDECIDED"]
  Restore -->|Verify state and behavior: UNDECIDED| Verified{"Recovery confirmed: UNDECIDED"}
  Forward -->|Verify reconciled effects: UNDECIDED| Verified
  Verified -->|Yes: UNDECIDED| Complete["Recovery completed: UNDECIDED"]
  Verified -->|No or unresolved: UNDECIDED| Escalate["Recovery escalation: UNDECIDED"]`,
  },
  "diagrams/data-model.mmd": {
    source: "docs/backend/03-persistence-model.md",
    question: "Which identities, relationships, and invariants define the persistence boundary?",
    graph: `flowchart LR
  Entity["Entity identity: UNDECIDED"]
  Related["Related identity: UNDECIDED"]
  Invariant["Invariant: UNDECIDED"]
  Owner["Consistency owner: UNDECIDED"]
  Entity -->|Relationship and cardinality: UNDECIDED| Related
  Entity -->|Constraint: UNDECIDED| Invariant
  Related -->|Constraint: UNDECIDED| Invariant
  Owner -->|Mutation and lifecycle authority: UNDECIDED| Entity
  Owner -->|Atomicity boundary: UNDECIDED| Related`,
  },
  "diagrams/auth-flow.mmd": {
    source: "docs/backend/01-authentication.md",
    question: "How is identity evidence evaluated and how are missing or invalid identities handled?",
    graph: `flowchart TD
  Evidence["Identity evidence: UNDECIDED"] -->|Check source and freshness: UNDECIDED| Policy{"Authentication policy: UNDECIDED"}
  Policy -->|Accepted: UNDECIDED| Identity["Authenticated identity: UNDECIDED"]
  Policy -->|Missing or rejected: UNDECIDED| Rejected["Rejected identity: UNDECIDED"]
  Policy -->|Unavailable verifier: UNDECIDED| Unavailable["Authentication unavailable: UNDECIDED"]
  Identity -->|Apply expiry or revocation: UNDECIDED| Lifetime["Identity lifetime: UNDECIDED"]
  Rejected -->|Safe public outcome: UNDECIDED| Report["Authentication result: UNDECIDED"]
  Unavailable -->|Failure policy: UNDECIDED| Report`,
  },
  "diagrams/authorization-flow.mmd": {
    source: "docs/backend/02-authorization.md",
    question: "Which policy decides whether a principal may act on a particular resource?",
    graph: `flowchart TD
  Principal["Authenticated principal: UNDECIDED"] -->|Provide identity and scope: UNDECIDED| Policy{"Authorization policy: UNDECIDED"}
  Resource["Resource and action: UNDECIDED"] -->|Provide ownership and context: UNDECIDED| Policy
  Policy -->|Permitted: UNDECIDED| Allowed["Authorized effect: UNDECIDED"]
  Policy -->|Denied: UNDECIDED| Denied["Denied action: UNDECIDED"]
  Policy -->|Missing context or unavailable policy: UNDECIDED| Unavailable["Authorization failure: UNDECIDED"]
  Allowed -->|Record decision evidence: UNDECIDED| Audit["Audit boundary: UNDECIDED"]
  Denied -->|Safe rejection and audit: UNDECIDED| Audit
  Unavailable -->|Safe failure and audit: UNDECIDED| Audit`,
  },
  "diagrams/request-lifecycle.mmd": {
    source: "docs/backend/04-http-api-policy.md",
    question: "How does the API validate a request, own its effects, and publish an accurate response?",
    graph: `flowchart TD
  Request["Request contract: UNDECIDED"] -->|Validate caller and input: UNDECIDED| Valid{"Request permitted: UNDECIDED"}
  Valid -->|Rejected: UNDECIDED| Error["Public rejection: UNDECIDED"]
  Valid -->|Accepted: UNDECIDED| Effect["Effect owner: UNDECIDED"]
  Effect -->|Confirm completion: UNDECIDED| Response["Public response: UNDECIDED"]
  Effect -->|Failure or timeout: UNDECIDED| Partial["Partial or unknown outcome: UNDECIDED"]
  Partial -->|Reconcile before repeating effects: UNDECIDED| Recovery["Recovery contract: UNDECIDED"]
  Recovery -->|Report actual outcome: UNDECIDED| Response`,
  },
  "diagrams/user-flow.mmd": {
    source: "docs/frontend/FRONTEND_DESIGN.md",
    question: "How does a user complete the intended action and recover when it cannot finish?",
    graph: `flowchart TD
  Intent["User intent: UNDECIDED"] -->|Enter journey: UNDECIDED| Action["Primary action: UNDECIDED"]
  Action -->|Submit work: UNDECIDED| Outcome{"Observable outcome: UNDECIDED"}
  Outcome -->|Completed: UNDECIDED| Success["User value delivered: UNDECIDED"]
  Outcome -->|Rejected or failed: UNDECIDED| Recovery["Recovery or exit: UNDECIDED"]
  Action -->|Cancel or leave: UNDECIDED| Exit["Saved or discarded work: UNDECIDED"]
  Recovery -->|Preserve input and explain next action: UNDECIDED| Exit`,
  },
  "diagrams/route-map.mmd": {
    source: "docs/frontend/FRONTEND_DESIGN.md",
    question: "Which route owns each destination and what handles unavailable or denied navigation?",
    graph: `flowchart LR
  Entry["Entry route: UNDECIDED"] -->|Navigate or deep link: UNDECIDED| Guard{"Route guard: UNDECIDED"}
  Guard -->|Available and permitted: UNDECIDED| Destination["Destination route: UNDECIDED"]
  Guard -->|Missing or unsupported: UNDECIDED| Missing["Unavailable route: UNDECIDED"]
  Guard -->|Not permitted: UNDECIDED| Denied["Navigation denied: UNDECIDED"]
  Destination -->|Back or exit: UNDECIDED| Return["Return destination: UNDECIDED"]
  Missing -->|Recovery destination: UNDECIDED| Return
  Denied -->|Recovery destination: UNDECIDED| Return`,
  },
  "diagrams/state-ownership.mmd": {
    source: "docs/frontend/FRONTEND_DESIGN.md",
    question: "Which state is authoritative and how are derived views updated or invalidated?",
    graph: `flowchart LR
  Owner["Canonical owner: UNDECIDED"]
  Derived["Derived state: UNDECIDED"]
  View["Rendered state: UNDECIDED"]
  Invalidate["Invalidation: UNDECIDED"]
  View -->|User command: UNDECIDED| Owner
  Owner -->|Derive with identity and version: UNDECIDED| Derived
  Derived -->|Read projection: UNDECIDED| View
  Owner -->|State changed or deleted: UNDECIDED| Invalidate
  Invalidate -->|Discard stale projection: UNDECIDED| Derived`,
  },
  "diagrams/component-boundary.mmd": {
    source: "docs/frontend/FRONTEND_DESIGN.md",
    question: "Which component owns state and which contracts cross parent and child boundaries?",
    graph: `flowchart LR
  Parent["Parent owner: UNDECIDED"]
  Contract["Component contract: UNDECIDED"]
  Child["Child responsibility: UNDECIDED"]
  Cleanup["Lifetime cleanup: UNDECIDED"]
  Parent -->|Inputs and state ownership: UNDECIDED| Contract
  Contract -->|Props or capabilities: UNDECIDED| Child
  Child -->|Events or change requests: UNDECIDED| Parent
  Parent -->|Detach or replace instance: UNDECIDED| Cleanup
  Cleanup -->|Cancel owned work and subscriptions: UNDECIDED| Child`,
  },
  "diagrams/mobile-user-flow.mmd": {
    source: "docs/mobile/app-contract.md",
    question: "How do lifecycle and platform capability changes affect the user's work?",
    graph: `flowchart TD
  Lifecycle["App lifecycle: UNDECIDED"] -->|Resume journey: UNDECIDED| Capability{"Platform capability: UNDECIDED"}
  Capability -->|Available: UNDECIDED| Work["User work: UNDECIDED"]
  Capability -->|Unavailable or denied: UNDECIDED| Fallback["Capability fallback: UNDECIDED"]
  Work -->|Complete action: UNDECIDED| Outcome["User outcome: UNDECIDED"]
  Work -->|Offline or suspended: UNDECIDED| Interrupted["Interrupted work: UNDECIDED"]
  Interrupted -->|Restore or reconcile: UNDECIDED| Recovery["Recovery outcome: UNDECIDED"]
  Fallback -->|Explain supported next action: UNDECIDED| Recovery`,
  },
  "diagrams/infra-boundary.mmd": {
    source: "docs/infra/module-contract.md",
    question: "Where do resource, state, and execution authority belong across infrastructure boundaries?",
    graph: `flowchart LR
  Input["Declared inputs: UNDECIDED"]
  Module["Resource owner: UNDECIDED"]
  State["State authority: UNDECIDED"]
  External["External resource owner: UNDECIDED"]
  Executor["Execution authority: UNDECIDED"]
  Input -->|Validated module contract: UNDECIDED| Module
  Executor -->|Reviewed change authority: UNDECIDED| Module
  Module -->|Read or update owned state: UNDECIDED| State
  Module -->|Consume external contract: UNDECIDED| External
  State -->|State identity and recovery contract: UNDECIDED| Executor`,
  },
  "diagrams/data-lineage.mmd": {
    source: "docs/data/lineage.md",
    question: "Which inputs and transformations produce a published dataset and where do rejected records go?",
    graph: `flowchart LR
  Input["Input dataset: UNDECIDED"] -->|Versioned input contract: UNDECIDED| Transform["Transformation: UNDECIDED"]
  Transform -->|Output grain and lineage: UNDECIDED| Quality{"Publication criteria: UNDECIDED"}
  Quality -->|Accepted: UNDECIDED| Published["Published dataset: UNDECIDED"]
  Quality -->|Rejected or unknown: UNDECIDED| Quarantine["Quarantine: UNDECIDED"]
  Published -->|Consumer version contract: UNDECIDED| Consumer["Downstream consumer: UNDECIDED"]
  Quarantine -->|Record cause and recovery owner: UNDECIDED| Recovery["Correction or backfill plan: UNDECIDED"]`,
  },
};

const frontendRequest: DiagramDefinition = {
  source: "docs/integrations/backend-api.md",
  question: "How does the frontend handle response freshness, cancellation, and unknown backend outcomes?",
  graph: `flowchart TD
  Intent["Request intent: UNDECIDED"] -->|Build consumed API contract: UNDECIDED| Request["Client request: UNDECIDED"]
  Request -->|Receive response: UNDECIDED| Current{"Response matches current intent: UNDECIDED"}
  Current -->|Yes: UNDECIDED| Apply["Apply response: UNDECIDED"]
  Current -->|No: UNDECIDED| Stale["Stale response: UNDECIDED"]
  Request -->|Interrupted or deadline reached: UNDECIDED| Cancel["Cancellation or timeout: UNDECIDED"]
  Request -->|Rejected or failed: UNDECIDED| Error["Client error state: UNDECIDED"]
  Cancel -->|Do not assume backend rollback: UNDECIDED| Unknown["Backend outcome reconciliation: UNDECIDED"]
  Unknown -->|Bound retry by identity and deadline: UNDECIDED| Recovery["User recovery outcome: UNDECIDED"]
  Error -->|Preserve user intent: UNDECIDED| Recovery`,
};

function definitionFor(filePath: string, scope: Scope): DiagramDefinition {
  if (filePath === "diagrams/request-lifecycle.mmd" && scope === "frontend") return frontendRequest;
  const definition = definitions[filePath];
  if (definition === undefined) throw new Error(`Missing diagram definition: ${filePath}`);
  return definition;
}

export function renderDiagram(filePath: string, scope: Scope): string {
  const definition = definitionFor(filePath, scope);
  return `%% Draft: illustrative placeholders; not accepted architecture.
%% Source: ${definition.source}
%% Question: ${definition.question}
%% Replace UNDECIDED nodes and edge labels with project decisions; remove inapplicable branches.
${definition.graph}
`;
}

export function renderDiagramIndex(files: ReadonlyArray<{ readonly path: string; readonly title?: string }>, scope: Scope): string {
  const rows = files.map((file) => {
    const definition = definitionFor(file.path, scope);
    return `| [${file.title ?? file.path}](${file.path.slice("diagrams/".length)}) | ${definition.question} | [Source](../${definition.source}) |`;
  });
  return `# Diagrams

${documentMetadata([["Status", "Draft"], ["Owner", "UNASSIGNED"]])}

## Available Views

These diagrams are design prompts, not accepted architecture. Each view asks one question and points to the document that owns the corresponding decisions.

| Diagram | Reader question | Decision source |
| --- | --- | --- |
${rows.join("\n")}

## Maintaining a View

- Replace UNDECIDED identities, boundaries, edge actions, and branch conditions with evidence from the decision source. Remove branches that do not apply.
- Keep composition views separate from operation flows. Data-model edges do not assert cardinality until the project specifies it.
- Label all interactions and outcomes. For operation flows, record failure, interruption, partial state, recovery ownership, and bounded retry rules where reachable.
- Keep reported success consistent with observable completion; a cancellation or timeout does not by itself prove that external effects were undone.
- Update the source document and related decision record when meaning changes, then update the diagram. Preserve project-specific edits during scaffold updates.
- Review rendered Mermaid output in the project's chosen viewer; source generation alone does not verify layout or accessibility. Keep the reader question and decision source available as a text description.
`;
}
