import type { TopicContract } from "./contract.js";

export const engineeringOperationsTopics: Readonly<Record<string, TopicContract>> = {
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
};
