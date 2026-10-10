import { documentMetadata } from "./document-format.js";

interface TopicContract {
  readonly purpose: string;
  readonly decisions: readonly string[];
  readonly source?: string;
}

const topicContracts: Readonly<Record<string, TopicContract>> = {
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
  "docs/engineering/08-threat-model.md": {
    purpose: "Describe how an actor with specific capabilities could cross a trust boundary, affect an asset, and defeat the intended controls.",
    decisions: [
      "Assets: UNDECIDED. Identify sensitive data, critical operations, and their owners.",
      "Trust boundaries: UNDECIDED. Map identities, components, external services, and data flows.",
      "Attacker capabilities: UNDECIDED. State required access, permissions, and controlled inputs.",
      "Threat scenarios: UNDECIDED. Connect entry points and preconditions to concrete impacts.",
      "Mitigations and residual risk: UNDECIDED. Assign owners and explain what remains possible.",
      "Verification: UNDECIDED. Link each important control to evidence or a focused regression.",
    ],
  },
  "docs/engineering/09-data-integrity.md": {
    purpose: "Define which data properties must remain true through concurrent changes, retries, migrations, and recovery.",
    decisions: [
      "Invariants: UNDECIDED. Record identity, uniqueness, referential integrity, and valid state transitions.",
      "Transaction boundaries: UNDECIDED. Specify atomic changes and the state allowed after partial failure.",
      "Concurrency and retries: UNDECIDED. Define version checks, ordering, idempotency, and duplicate handling.",
      "Reconciliation: UNDECIDED. Describe how drift is detected and repaired without losing user data.",
      "Migration and restore checks: UNDECIDED. Identify integrity evidence before and after changes.",
      "Data owner and repair authority: UNASSIGNED. State who may correct inconsistent records.",
    ],
  },
  "docs/ops/disaster-recovery.md": {
    purpose: "Plan recovery of critical user journeys after loss of a service, region, dependency, or persistent state.",
    decisions: [
      "Disaster scenarios and activation authority: UNDECIDED. Define triggers and decision owners.",
      "RTO: UNDECIDED. Set the maximum acceptable recovery time for each critical journey.",
      "RPO: UNDECIDED. Set the acceptable data-loss window and identify the backup source.",
      "Restore order: UNDECIDED. Map dependencies, credentials, infrastructure, and state restoration.",
      "Recovery validation: UNDECIDED. Check integrity and critical journeys before reopening traffic.",
      "Failover and failback: UNDECIDED. Specify conditions, owners, and rollback or forward-fix choices.",
      "Restore exercise: UNDECIDED. Record cadence, last tested recovery time, data loss, and unresolved gaps.",
    ],
  },
  "docs/ops/service-levels.md": {
    purpose: "Make service reliability objectives measurable and connect their failure to operational decisions.",
    decisions: [
      "Critical user journeys: UNDECIDED. Define which experiences each objective protects.",
      "SLI: UNDECIDED. Specify the numerator, denominator, data source, exclusions, and measurement owner.",
      "SLO target: UNDECIDED. Choose a justified availability, correctness, or latency objective.",
      "Measurement window: UNDECIDED. Specify aggregation, percentiles, and the rolling or calendar period.",
      "Error budget: UNDECIDED. Derive the allowed failure budget from the objective and window.",
      "Budget burn and response: UNDECIDED. Define alerts, release restrictions, and escalation thresholds.",
      "Exceptions and review: UNDECIDED. Assign an owner and a cadence for changing objectives.",
    ],
  },
  "docs/cli/command-contract.md": {
    purpose: "Specify each command's inputs, side effects, cancellation, and compatibility independently of its implementation.",
    source: "docs/cli/README.md",
    decisions: [
      "Command purpose and side effects: UNDECIDED. State what success changes and what requires confirmation.",
      "Argument grammar: UNDECIDED. Define positional arguments, flags, defaults, aliases, and incompatible options.",
      "Path and working-directory rules: UNDECIDED. Specify target resolution and overwrite boundaries.",
      "Dry-run, retry, and cancellation: UNDECIDED. Define repeatability and recovery after partial work.",
      "Compatibility and deprecation: UNDECIDED. Identify observable changes and migration guidance.",
    ],
  },
  "docs/cli/configuration.md": {
    purpose: "Define how a command obtains, validates, and explains its effective configuration.",
    source: "docs/cli/README.md",
    decisions: [
      "Configuration sources: UNDECIDED. List supported files, environment variables, and command flags.",
      "Configuration precedence: UNDECIDED. Define the order of defaults, files, environment, and flags.",
      "Missing, empty, and invalid values: UNDECIDED. Specify defaults and failure behavior separately.",
      "Validation and unknown keys: UNDECIDED. Identify accepted types and diagnostics.",
      "Effective-config output: UNDECIDED. Explain selected sources without exposing secrets.",
    ],
  },
  "docs/cli/output-and-exit-codes.md": {
    purpose: "Keep terminal and machine-readable results consistent with the actual command outcome.",
    source: "docs/cli/README.md",
    decisions: [
      "Output schema: UNDECIDED. Define JSON fields, versioning, and single-result framing.",
      "stdout and stderr: UNDECIDED. Separate machine-readable results, diagnostics, progress, and prompts.",
      "Exit-code taxonomy: UNDECIDED. Distinguish success, validation failure, conflict, and interruption.",
      "Completion boundary: UNDECIDED. Specify when writes, recovery, and cleanup permit a success report.",
      "Partial failure details: UNDECIDED. Preserve original causes and accurately report remaining changes.",
    ],
  },
  "docs/cli/shell-completion.md": {
    purpose: "Define discoverable shell integration without executing command side effects during completion.",
    source: "docs/cli/README.md",
    decisions: [
      "Supported shells: UNDECIDED. Identify versions and installation or removal steps.",
      "Completion sources: UNDECIDED. Specify commands, flags, enum values, and file candidates.",
      "Quoting and escaping: UNDECIDED. Cover spaces, Unicode, metacharacters, and platform paths.",
      "Completion side effects: UNDECIDED. Define read-only behavior and bounded execution cost.",
      "Compatibility checks: UNDECIDED. Verify generated completions against the command grammar.",
    ],
  },
};

export function renderTopicDocument(filePath: string, title: string): string | undefined {
  const topic = topicContracts[filePath];
  if (topic === undefined) return undefined;
  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Contract

${topic.purpose}
${topic.source ? `\nProject-wide decisions: ${topic.source}\n` : ""}
## Required Decisions

${topic.decisions.map((decision) => `- ${decision}`).join("\n")}

## Verification

- Owner: UNASSIGNED
- Source of truth and related ADR: UNDECIDED
- Required evidence and remaining gaps: UNDECIDED
- Validation route: VALIDATION.md
`;
}
