import { documentMetadata } from "./document-format.js";

interface TopicContract {
  readonly purpose: string;
  readonly decisions: readonly string[];
  readonly source?: string;
}

const topicContracts: Readonly<Record<string, TopicContract>> = {
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
