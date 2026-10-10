import type { TopicContract } from "./contract.js";

export const operationsTopics: Readonly<Record<string, TopicContract>> = {
  "docs/ops/00-operational-contract.md": {
    purpose: "Connect operating priorities, acceptable failure, and recovery responsibility to the user outcomes this project must support.",
    source: "docs/product/02-spec.md",
    decisions: [
      "Critical journeys: UNDECIDED. Name the user-visible outcomes, supported environments, workloads, and dependencies that operating decisions must protect.",
      "Operating ownership: UNDECIDED. Assign primary and backup owners, escalation paths, decision authority, and handoffs for relevant failure scenarios.",
      "Failure tolerance: UNDECIDED. Define acceptable degraded behavior, unavailable dependencies, resource exhaustion, and conditions requiring work to stop.",
      "Recovery budgets: UNDECIDED. Set justified recovery-time and data-loss limits and distinguish desired targets from observed recovery evidence.",
      "Change and release conditions: UNDECIDED. Identify evidence needed to promote a change, stop a rollout, recover, or escalate an unresolved outcome.",
      "Evidence and review: UNDECIDED. Select operational signals, exercises, and review triggers that demonstrate the critical journeys still work.",
    ],
  },
  "docs/ops/observability.md": {
    purpose: "Make operating signals answer concrete diagnosis and recovery questions rather than collecting telemetry without a responsible action.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Diagnosis questions: UNDECIDED. Identify user impact, failures, delay, capacity, and unknown effects that an operator must distinguish.",
      "Signal interpretation: UNDECIDED. Specify events, metrics, traces, units, observation points, aggregation windows, exclusions, and missing-data meaning.",
      "Correlation boundaries: UNDECIDED. Define operation, attempt, artifact, environment, and dependency identities without confusing request acceptance with effect completion.",
      "Collection constraints: UNDECIDED. Bound sampling, telemetry overhead, sensitive fields, access, retention, and failure of the collection path.",
      "Actionable response: UNDECIDED. Connect each actionable threshold to an owner, diagnosis steps, recovery choices, and evidence that the condition cleared.",
    ],
  },
  "docs/ops/ci.md": {
    purpose: "Define the smallest reliable verification pipeline for the changed risks, with reproducible evidence and explicit execution and cost boundaries.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Verification scope: UNDECIDED. Map checks and environment rows to affected contracts, runtime support, packaging, or user-visible risks instead of running every check by default.",
      "Evidence identity: UNDECIDED. Tie results to the tested commit, toolchain, inputs, and produced artifact; distinguish a passing check from publication or deployment.",
      "Execution boundary: UNDECIDED. Specify trusted and untrusted inputs, credential access, job permissions, isolation, and which jobs may publish or mutate external state.",
      "Failure and interruption: UNDECIDED. Define blocking checks, timeouts, concurrency cancellation, partial output, retry eligibility, and local reproduction.",
      "Cost and duplication: UNDECIDED. Set a justified matrix and run frequency, reuse equivalent evidence, and avoid duplicate build or package checks without losing required coverage.",
    ],
  },
  "docs/ops/release.md": {
    purpose: "Promote a known artifact through a deliberate release sequence and report what was actually published, activated, and verified.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Release unit: UNDECIDED. Define the version, artifact identity, included changes, destination, and owner of the promotion decision.",
      "Compatibility and ordering: UNDECIDED. Identify consumer, configuration, and data compatibility requirements and dependencies that constrain the release sequence.",
      "Promotion evidence: UNDECIDED. Name required checks, artifact validation, and user-visible acceptance criteria tied to the exact candidate.",
      "Activation and observation: UNDECIDED. Define rollout stages, health windows, stop conditions, communication, and how published artifacts differ from active runtime state.",
      "Partial release recovery: UNDECIDED. Record possible mixed-version or partially activated states, rollback limits, forward-fix options, and evidence of recovery.",
    ],
  },
  "docs/ops/rollback.md": {
    purpose: "Choose a safe recovery action from the actual failed state rather than assuming that restoring an older artifact reverses every effect.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Observed state: UNDECIDED. Identify active artifacts, configuration, data versions, external effects, user impact, and unresolved completion before acting.",
      "Recovery eligibility: UNDECIDED. Determine reversible steps, compatibility limits, irreversible effects, and when rollback must yield to reconciliation or forward repair.",
      "Recovery procedure: UNDECIDED. Record the selected target, owner, operation order, checkpoints, and how a partial or repeated recovery attempt is handled.",
      "Restoration evidence: UNDECIDED. Verify state integrity, supported consumers, and critical user journeys against the intended recovery target.",
      "Stop and escalation: UNDECIDED. Define time limits, unsafe or unconfirmed states, communication, and the owner of unresolved recovery decisions.",
    ],
  },
  "docs/ops/config-and-env.md": {
    purpose: "Treat configuration as a versioned behavior contract, including how values become active and how conflicting or invalid state is detected.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Configuration inventory: UNDECIDED. Identify keys, types, owners, environment scope, defaults, required values, and sensitive values that belong in secret storage.",
      "Source precedence: UNDECIDED. Define canonical sources, overrides, validation, and behavior for missing, malformed, or conflicting values.",
      "Activation and drift: UNDECIDED. Explain reload or restart requirements, active-value evidence, and detection of differences between declared and running configuration.",
      "Compatibility and recovery: UNDECIDED. Define key changes, version overlap, rollback limits, and preservation of valid project-specific values.",
      "Configuration evidence: UNDECIDED. Check representative environments, invalid inputs, partial activation, and recovery without exposing sensitive values in diagnostics.",
    ],
  },
  "docs/ops/secrets.md": {
    purpose: "Assign secret ownership and lifecycle responsibilities while keeping secret values out of repository documentation, examples, telemetry, and build artifacts.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Secret inventory: UNDECIDED. Record references, purpose, owner, consumers, environment scope, and storage authority without recording plaintext values.",
      "Access boundary: UNDECIDED. Define issuance, retrieval, permitted identities, execution scope, audit evidence, and separation between build and runtime access.",
      "Rotation and revocation: UNDECIDED. Specify replacement ordering, overlap limits, consumer adoption, invalidation, and how failed rotation is detected and recovered.",
      "Exposure response: UNDECIDED. Define containment, revocation, affected copies, artifact or log handling, communication, and recovery evidence after a suspected leak.",
      "Lifecycle evidence: UNDECIDED. Verify consumers use the intended current identity and that revoked or retired credentials no longer authorize work.",
    ],
  },
  "docs/ops/backup-and-restore.md": {
    purpose: "Demonstrate that protected state can be restored into a usable, consistent system within the project's recovery budgets.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Protected state: UNDECIDED. Inventory authoritative data, configuration, identities, and dependent metadata needed to recover critical user journeys.",
      "Backup contract: UNDECIDED. Define capture consistency, frequency, retention, access, encryption-key ownership, and acceptable data-loss limits.",
      "Restore prerequisites: UNDECIDED. Identify available artifacts, keys, credentials, environment compatibility, dependency order, and the owner able to start recovery.",
      "Restore evidence: UNDECIDED. Record a representative restoration, measured recovery time and data loss, integrity checks, and successful user-visible work.",
      "Partial restore and maintenance: UNDECIDED. Define containment of inconsistent state, reconciliation, failed-restore escalation, and triggers for repeating the exercise.",
    ],
  },
  "docs/ops/incident-response.md": {
    purpose: "Coordinate diagnosis, containment, communication, and verified recovery from user-visible impact while retaining evidence of decisions and effects.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "User impact and severity: UNDECIDED. Define affected journeys, scope, duration, uncertainty, and the conditions that activate each response level.",
      "Roles and communication: UNDECIDED. Assign incident lead, technical and communication owners, escalation, channels, and update conditions.",
      "Containment decisions: UNDECIDED. Identify evidence needed to limit ongoing harm, stop changes, isolate dependencies, or choose recovery without destroying useful evidence.",
      "Recovery confirmation: UNDECIDED. Verify restored state and critical journeys, monitor recurrence, and distinguish mitigation from confirmed resolution.",
      "Timeline and follow-up: UNDECIDED. Separate observed facts from hypotheses, record actions and outcomes, and assign corrective work with completion evidence.",
    ],
  },
};
