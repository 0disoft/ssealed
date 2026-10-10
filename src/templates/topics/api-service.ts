import type { TopicContract } from "./contract.js";

export const apiServiceTopics: Readonly<Record<string, TopicContract>> = {
  "docs/api-service/api-lifecycle.md": {
    purpose: "Define the lifecycle of each client-facing operation from contract publication through migration and retirement.",
    source: "docs/api-service/README.md",
    decisions: [
      "Operation inventory: UNDECIDED. Record consumers, operation purpose, request and response schemas, and observable side effects.",
      "Contract authority: UNDECIDED. Assign ownership, publication, and compatibility checks for api/openapi.yaml.",
      "Access control: UNDECIDED. Specify authentication, per-operation authorization, and tenant boundaries.",
      "State transitions and concurrency: UNDECIDED. Define valid commands, preconditions, expected versions, and conflict behavior.",
      "Versioning and deprecation: UNDECIDED. Set breaking-change rules, notice periods, and client migration evidence.",
      "Client errors and correlation: UNDECIDED. Define stable errors, request identifiers, retry guidance, and redaction.",
      "Release readiness: UNDECIDED. Identify compatibility evidence, recovery choices, and the support owner.",
    ],
  },
  "docs/api-service/idempotency.md": {
    purpose: "Specify how repeated requests avoid repeating side effects, including concurrent retries and partial failures.",
    source: "docs/api-service/README.md",
    decisions: [
      "Key scope and ownership: UNDECIDED. Bind each key to the caller, tenant, and operation, and state which operations require a key.",
      "Request identity: UNDECIDED. Define input comparison and the response when a key is reused with different input.",
      "Concurrent duplicates: UNDECIDED. Define reservations, in-progress responses, and atomicity between the stored outcome and side effects.",
      "Replay outcomes: UNDECIDED. Specify which success and failure results are retained and how they are returned to retries.",
      "Retention and expiry: UNDECIDED. Set the retention window and behavior for late retries after a key expires.",
      "Failure and external effects: UNDECIDED. Account for lost responses, timeouts, crashes, downstream partial changes, and reconciliation.",
      "Verification scenarios: UNDECIDED. Cover concurrent duplicates, conflicting reuse, cross-tenant keys, expiry, and failure recovery.",
    ],
  },
  "docs/api-service/rate-limits.md": {
    purpose: "Define predictable usage limits and protect capacity without letting one caller exhaust another caller's allocation.",
    source: "docs/api-service/README.md",
    decisions: [
      "Quota dimensions: UNDECIDED. Choose caller, tenant, credential, operation, or resource limits and their precedence.",
      "Accounting unit and windows: UNDECIDED. Define request or cost counting, aggregation windows, burst allowance, and reset behavior.",
      "Enforcement boundary: UNDECIDED. Identify the authoritative counter and which identities or request attributes may be trusted.",
      "Limit response and retry: UNDECIDED. Specify errors, client-visible remaining allowance, retry guidance, and backoff behavior.",
      "Fairness and isolation: UNDECIDED. State how tenants share capacity and how exemptions avoid starving other callers.",
      "Counter failures and races: UNDECIDED. Define concurrent accounting and whether counter outages permit or reject requests.",
      "Observability and changes: UNDECIDED. Assign telemetry ownership and explain how quota changes reach clients.",
    ],
  },
  "docs/api-service/slo.md": {
    purpose: "Define measurable service objectives for API operations and connect budget consumption to operational decisions.",
    source: "docs/api-service/README.md",
    decisions: [
      "Protected operations: UNDECIDED. Map each objective to critical API operations and the user journey it protects.",
      "SLI definition: UNDECIDED. Specify successful eligible requests, the numerator and denominator, justified exclusions, and the measurement source.",
      "Measurement window and targets: UNDECIDED. Choose justified targets and a rolling or calendar observation period.",
      "Latency and correctness: UNDECIDED. Define relevant percentiles, failure classes, thresholds, and aggregation units.",
      "Error budget policy: UNDECIDED. Define the allowed failure budget, burn signals, and release or capacity decisions when it is consumed.",
      "Alerts and escalation owner: UNASSIGNED. Assign responsibility and set actionable thresholds for sustained and rapid budget burn.",
      "Review evidence: UNDECIDED. Record observation coverage, the last review, dependency assumptions, and unresolved measurement gaps.",
    ],
  },
};
