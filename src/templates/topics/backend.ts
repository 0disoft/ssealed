import type { Density } from "../../core/types.js";
import type { TopicContract } from "./contract.js";

const backendOverviews: Readonly<Record<string, TopicContract>> = {
  "docs/backend/README.md": {
    purpose: "Orient contributors to backend responsibilities and the documents that own each decision, without duplicating all authentication, persistence, and API policies in every document.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Backend responsibilities: UNDECIDED. Name owned capabilities, state, external consumers, and responsibilities that belong to other owners.",
      "Contract owners: UNDECIDED. Assign owners for the API, identity, authorization, persistence, and operational contracts that apply to this repository.",
      "Decision map: UNDECIDED. Point to each applicable detailed policy or keep its unresolved decisions here when that policy document is absent.",
      "API authority: UNDECIDED. Align published behavior with api/openapi.yaml and identify consumers affected by a contract change.",
      "Change routing: UNDECIDED. Identify related decision records, validation, migrations, and recovery work required for backend changes.",
    ],
  },
  "docs/backend/00-api-server-boundary.md": {
    purpose: "Define what the API server owns from input acceptance through observable completion, and which state and external effects remain under another owner's authority.",
    source: "docs/backend/README.md",
    decisions: [
      "Owned entrypoints: UNDECIDED. List request or event boundaries, input contracts, callers, and work explicitly outside this server's scope.",
      "External authority: UNDECIDED. Identify consumed services and state, their owners, and the contracts required when control crosses a boundary.",
      "Identity and permission boundary: UNDECIDED. Identify where caller identity and permission are established before protected reads or effects.",
      "Effect completion: UNDECIDED. Distinguish accepted work from completed effects and define the evidence needed before publishing success.",
      "Interruption and recovery: UNDECIDED. Identify partial or unknown outcomes, duplicate requests, cancellation ownership, and recovery responsibility.",
    ],
  },
};

export const backendTopics: Readonly<Record<string, TopicContract>> = {
  ...backendOverviews,
  "docs/backend/01-authentication.md": {
    purpose: "Specify how caller identity is established and remains valid. Keep identity verification separate from permission to perform a particular action.",
    source: "docs/backend/README.md",
    decisions: [
      "Identity evidence: UNDECIDED. Identify supported caller types, credential sources, trusted issuers, and validation of scope and audience.",
      "Identity lifetime: UNDECIDED. Define issuance, expiry, renewal, revocation, and behavior when credentials change during an operation.",
      "Credential handling: UNDECIDED. Assign storage, transmission, redaction, and rotation responsibilities without recording secrets in this document.",
      "Verifier failure: UNDECIDED. Define missing or invalid evidence, unavailable verifiers, and public failure behavior without treating an unknown identity as verified.",
      "Identity evidence checks: UNDECIDED. Select valid, expired, revoked, wrong-context, and unavailable-verifier scenarios relevant to the chosen model.",
    ],
  },
  "docs/backend/02-authorization.md": {
    purpose: "Define permission for a principal to act on a resource, including ownership and tenant context, at the point where protected reads or mutations occur.",
    source: "docs/backend/README.md",
    decisions: [
      "Principal and resource: UNDECIDED. Identify identity, tenant, resource ownership, requested action, and context used for a permission decision.",
      "Decision enforcement: UNDECIDED. Name the policy authority and enforcement points for ordinary, batch, asynchronous, and internal operations that apply.",
      "Changing permissions: UNDECIDED. Define revocation, stale policy data, and revalidation when resource ownership or caller authority changes.",
      "Policy failure: UNDECIDED. Specify outcomes for denied actions, missing context, and unavailable policy dependencies before protected effects occur.",
      "Authorization evidence: UNDECIDED. Check allowed and denied actions, cross-owner access, partial batches, and audit boundaries without relying on UI restrictions.",
    ],
  },
  "docs/backend/03-persistence-model.md": {
    purpose: "Describe authoritative stored state, its identities and invariants, and the consistency and lifecycle responsibilities needed to maintain it.",
    source: "docs/backend/README.md",
    decisions: [
      "State authority: UNDECIDED. Identify authoritative records, derived projections or caches, and the owner that may change each fact.",
      "Identity and invariants: UNDECIDED. Define keys, relationships, uniqueness, valid states, and constraints reflected by db/schema.dbml when applicable.",
      "Consistency boundary: UNDECIDED. Identify changes that must be atomic, permitted temporary divergence, and concurrency or conflict handling.",
      "Access and capacity: UNDECIDED. Record representative reads and writes, workload assumptions, and evidence for storage or indexing choices.",
      "Data lifecycle: UNDECIDED. Specify retention, deletion propagation, migration, and recoverability across authoritative and derived copies.",
    ],
  },
  "docs/backend/04-http-api-policy.md": {
    purpose: "Define the observable HTTP contract and the relationship between accepted requests, owned effects, and reported responses.",
    source: "docs/backend/README.md",
    decisions: [
      "Request grammar: UNDECIDED. Specify methods, paths, headers, body limits, validation, and unsupported input in alignment with api/openapi.yaml.",
      "Response contract: UNDECIDED. Define success semantics, status, headers, pagination, and error-policy ownership without inventing undocumented behavior.",
      "Side effects and retries: UNDECIDED. Identify effect ownership, request identity, duplicate prevention, and which operations may safely be repeated.",
      "Completion and timeout: UNDECIDED. Distinguish accepted, completed, rejected, and unknown outcomes; define cancellation and deadline behavior.",
      "API evidence: UNDECIDED. Check representative clients, invalid inputs, duplicate requests, interrupted effects, and agreement between documentation and observable results.",
    ],
  },
  "docs/backend/05-error-response.md": {
    purpose: "Define stable public failures and recovery information while keeping internal diagnostics and sensitive implementation details separate.",
    source: "docs/backend/README.md",
    decisions: [
      "Public error shape: UNDECIDED. Define fields, correlation identity, safe messages, and optional validation details for the published API.",
      "Stable error codes: UNDECIDED. Map rejection and failure categories to codes and HTTP status semantics, including how clients distinguish them.",
      "Unknown outcomes: UNDECIDED. Specify what a failure or timeout reveals about committed effects and when reconciliation is required before a retry.",
      "Diagnostic boundary: UNDECIDED. Separate client-facing information from internal causes, sensitive values, and operator evidence.",
      "Error compatibility: UNDECIDED. Select consumer checks and define how codes, fields, and recovery advice may evolve.",
    ],
  },
  "docs/backend/06-logging-and-observability.md": {
    purpose: "Connect backend observations to concrete diagnosis and operating decisions, including effects whose outcome is not yet known.",
    source: "docs/backend/README.md",
    decisions: [
      "Observation questions: UNDECIDED. Identify the failures, latency, capacity, and correctness questions that operators must be able to answer.",
      "Correlation identity: UNDECIDED. Define request, operation, attempt, and external-effect identifiers and their propagation across boundaries.",
      "Signals and interpretation: UNDECIDED. Define events, metrics, and traces with units, observation points, aggregation windows, and outcome meanings.",
      "Sensitive fields: UNDECIDED. Specify redaction, permitted data, access, retention, and deletion responsibilities for telemetry copies.",
      "Action and evidence: UNDECIDED. Assign actionable thresholds, diagnosis and recovery owners, and checks that observations describe actual effects.",
    ],
  },
  "docs/backend/07-migration-strategy.md": {
    purpose: "Plan a compatible transition between stored-state or contract versions and identify recovery options for each possible partial state.",
    source: "docs/backend/README.md",
    decisions: [
      "Before and after state: UNDECIDED. Record schema and data versions, invariants, affected readers and writers, and the intended final state.",
      "Transition ordering: UNDECIDED. Define rollout, compatibility windows, backfill or dual-version work, and the point where older consumers stop working.",
      "Execution ownership: UNDECIDED. Assign the migration owner, concurrency control, resumable checkpoints, and handling of repeated or interrupted execution.",
      "Recovery eligibility: UNDECIDED. Distinguish reversible steps from irreversible effects and choose rollback, forward fix, or reconciliation accordingly.",
      "Completion evidence: UNDECIDED. Verify data and consumer behavior, identify stop conditions, and retain evidence before retiring the old representation.",
    ],
  },
  "docs/backend/08-backend-security.md": {
    purpose: "Identify the backend's protected assets and trust crossings, and connect each relevant misuse or failure scenario to a responsible control owner.",
    source: "docs/backend/README.md",
    decisions: [
      "Protected assets: UNDECIDED. Identify sensitive data, credentials, effects, and invariants, together with actors allowed to access or change them.",
      "Trust boundaries: UNDECIDED. Identify untrusted callers, inputs, destinations, and external dependencies and the validation at each crossing.",
      "Control ownership: UNDECIDED. Map identity, permission, secret handling, isolation, and audit decisions to their authoritative policies.",
      "Abuse and exhaustion: UNDECIDED. Define relevant misuse scenarios, resource limits, safe failure behavior, and recovery when a dependency or control is unavailable.",
      "Security evidence: UNDECIDED. Select representative rejection and containment checks and record unresolved risks without treating a scaffold as a completed assessment.",
    ],
  },
  "docs/backend/09-api-evolution.md": {
    purpose: "Change API behavior deliberately across active consumers, retaining compatibility evidence and an explicit transition or retirement plan.",
    source: "docs/backend/04-http-api-policy.md",
    decisions: [
      "Consumer inventory: UNDECIDED. Identify active clients, supported versions, ownership, release cadence, and consumers whose usage is unknown.",
      "Compatibility definition: UNDECIDED. Define compatible and breaking changes in fields, error codes, effect semantics, pagination, and retry behavior.",
      "Transition mechanism: UNDECIDED. Choose additive changes, version negotiation, overlap windows, or migration based on affected consumers.",
      "Rollout and recovery: UNDECIDED. Define promotion evidence, stop conditions, restoration limits, and communication to consumer owners.",
      "Retirement evidence: UNDECIDED. Record observed consumer adoption, remaining exceptions, and the owner and condition for removing the old contract.",
    ],
  },
  "docs/backend/10-data-integrity.md": {
    purpose: "Preserve stored-state invariants through concurrent, repeated, and partially completed operations, with explicit detection and reconciliation of divergence.",
    source: "docs/backend/03-persistence-model.md",
    decisions: [
      "Invariant inventory: UNDECIDED. Identify cross-record constraints, authoritative facts, derived copies, and the owner of each integrity rule.",
      "Concurrent changes: UNDECIDED. Define atomicity, conflicting writers, stale reads, and how ownership or state changes invalidate an operation.",
      "Duplicate and partial effects: UNDECIDED. Specify operation identity, durable evidence, retries, and interruption states that may need reconciliation.",
      "Divergence detection: UNDECIDED. Define observable checks, acceptable lag, diagnosis, and containment before incorrect data reaches consumers.",
      "Reconciliation evidence: UNDECIDED. Assign repair authority and verify restored invariants without silently discarding valid user changes.",
    ],
  },
};

export function backendOverviewFor(filePath: string, density: Density): TopicContract | undefined {
  const overview = backendOverviews[filePath];
  if (overview === undefined) return undefined;
  const errorPolicy = density === "minimal"
    ? "UNDECIDED. Record the error shape, stable codes, and HTTP status policy in this document."
    : "docs/backend/05-error-response.md; use the dedicated policy for public failure semantics.";
  return { ...overview, decisions: [...overview.decisions, `Error response policy: ${errorPolicy}`] };
}
