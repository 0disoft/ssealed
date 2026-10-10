import type { TopicContract } from "./contract.js";

export const engineeringTopics: Readonly<Record<string, TopicContract>> = {
  "docs/engineering/00-project-invariants.md": {
    purpose: "Name the properties that must remain true through ordinary changes, concurrent work, interruption, migration, and recovery.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Invariant inventory: UNDECIDED. Record each required property, affected state or contract, reason it matters, and the owner who can clarify it.",
      "Authority boundaries: UNDECIDED. Identify who may change each authoritative fact and distinguish source decisions from derived copies or cached state.",
      "Effect completion: UNDECIDED. Define when an effect is accepted, committed, or observable and which evidence permits a success report.",
      "Partial and conflicting state: UNDECIDED. Describe state allowed after interruption, retries, concurrent changes, and failed recovery without assuming effects were undone.",
      "Invariant evidence: UNDECIDED. Connect important properties to independent checks and representative invalid scenarios, including remaining coverage gaps.",
      "Change authority: UNDECIDED. Identify the rationale and consumer evidence required before intentionally revising an invariant.",
    ],
  },
  "docs/engineering/01-design-review-questions.md": {
    purpose: "Evaluate a proposed design against the actual problem, responsibility boundaries, alternatives, and future operating and recovery costs.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Problem and alternatives: UNDECIDED. State the observed need, constraints, doing-nothing outcome, and viable alternatives without choosing a technology first.",
      "Ownership and contracts: UNDECIDED. Identify authorities, affected consumers, invariants, and handoffs introduced or changed by the design.",
      "Failure and recovery: UNDECIDED. Describe partial effects, unavailable dependencies, interruption, conflicts, retry limits, and recovery responsibility.",
      "Cost and reversibility: UNDECIDED. Compare implementation, operating, maintenance, and exit costs, including irreversible choices.",
      "Decision evidence: UNDECIDED. Name the comparisons or experiments needed to resolve uncertainty and record accepted choices, rejected options, owners, and review triggers.",
    ],
  },
  "docs/engineering/02-code-review-checklist.md": {
    purpose: "Review the concrete observable change and its invariant, ownership, effect, and compatibility consequences using evidence relevant to the affected behavior.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Observable change: UNDECIDED. Describe the trigger, previous behavior, new behavior, affected users or consumers, and intended scope.",
      "Authority and compatibility: UNDECIDED. Identify changed contracts, access or ownership rules, derived surfaces, and consumers needing synchronized updates.",
      "Effect correctness: UNDECIDED. Review reads, mutations, external effects, interruption, retries, and what the reported outcome proves.",
      "Evidence quality: UNDECIDED. Select meaningful success, rejection, and recovery checks with an independent expected result; disclose skipped or indirect evidence.",
      "Delivery and recovery: UNDECIDED. Identify migration, rollout, operating, and restoration work required before the change can be used safely.",
    ],
  },
  "docs/engineering/03-performance-budget.md": {
    purpose: "Set measurable limits for important user-visible work and resource use, with representative workloads and explicit tradeoffs.",
    source: "docs/architecture/03-quality-attributes.md",
    decisions: [
      "Representative workload: UNDECIDED. Identify critical actions, environments, concurrency, data sizes, and operating conditions that the budget covers.",
      "Measurement contract: UNDECIDED. Define units, observation points, aggregation windows, percentiles or tails, baseline, and measurement uncertainty.",
      "Limits and tradeoffs: UNDECIDED. Set justified latency, memory, payload, compute, or other relevant limits and explain competing quality and cost goals.",
      "Degradation behavior: UNDECIDED. Specify admission, bounded work, cancellation, fallback, and recovery when a resource or dependency cannot meet the budget.",
      "Regression evidence: UNDECIDED. Define comparable measurement conditions, meaningful regression thresholds, and review triggers as workloads or support change.",
    ],
  },
  "docs/engineering/04-security-baseline.md": {
    purpose: "Connect protected assets and operations to explicit control ownership and evidence at the relevant trust boundaries.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Protected operations: UNDECIDED. Identify sensitive data, important effects, caller capabilities, and invariants that must survive misuse or unauthorized access.",
      "Trust crossings: UNDECIDED. Identify untrusted inputs, identities, destinations, dependencies, and the validation required when control or data crosses a boundary.",
      "Control ownership: UNDECIDED. Assign identity, permission, isolation, secret handling, audit, and failure-containment responsibilities to their actual owners.",
      "Control evidence: UNDECIDED. Select relevant rejection, revocation, cross-owner, unavailable-control, and resource-exhaustion scenarios without treating a checklist as proof.",
      "Residual risk: UNDECIDED. Record uncovered scenarios, assumptions, mitigation or containment owners, and conditions that require reassessment.",
    ],
  },
  "docs/engineering/05-testing-standard.md": {
    purpose: "Choose checks that establish important behavior and recovery properties while keeping evidence reproducible, interpretable, and proportionate to the risk.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Risk coverage: UNDECIDED. Map required contracts, invariants, and user outcomes to the narrowest useful unit, integration, consumer, runtime, or recovery checks.",
      "Independent oracle: UNDECIDED. Define expected results from the behavior contract rather than copying implementation details into assertions.",
      "Failure fixtures: UNDECIDED. Select meaningful invalid inputs, partial effects, concurrency ordering, interruption, and recovery scenarios using controlled fixtures where needed.",
      "Environment and evidence: UNDECIDED. Identify required support rows, artifact and toolchain identity, skipped conditions, and limits of automated or simulated checks.",
      "Evidence cost: UNDECIDED. Avoid redundant broad suites, bound execution cost, and retire checks whose original risk or contract no longer exists while preserving needed coverage.",
    ],
  },
  "docs/engineering/06-dependency-and-change-policy.md": {
    purpose: "Choose and maintain dependencies deliberately from the required capability, compatibility evidence, maintenance burden, and replacement cost.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Necessity and alternatives: UNDECIDED. State the required capability, built-in or existing alternatives, and the cost or risk that justifies a new dependency.",
      "Dependency inventory: UNDECIDED. Record runtime or development role, consumer impact, maintenance owner, licensing requirements, and relevant exposure.",
      "Compatibility updates: UNDECIDED. Define supported major ranges, reproducible build and lock behavior, compatible-update adoption, and evidence before deliberately promoting a new major.",
      "Change validation: UNDECIDED. Check affected runtime, package, consumer, and behavioral contracts and disclose unsupported environments or remaining gaps.",
      "Replacement and exit: UNDECIDED. Identify rollback limits, data or API migration, removal work, and triggers for replacing an unmaintained or unsuitable dependency.",
    ],
  },
  "docs/engineering/07-operability-and-failure-standard.md": {
    purpose: "Make failure state, observable completion, diagnosis, and recovery responsibility explicit for each important owned effect.",
    source: "docs/ops/00-operational-contract.md",
    decisions: [
      "Failure state: UNDECIDED. Describe rejected, unavailable, interrupted, partially committed, and unknown outcomes at the operation's effect boundaries.",
      "Completion reporting: UNDECIDED. Tie public success or failure to observable evidence and disclose committed effects or incomplete recovery accurately.",
      "Recovery ownership: UNDECIDED. Assign retries, compensation, reconciliation, restore, escalation, and bounded termination conditions to responsible owners.",
      "Diagnostic contract: UNDECIDED. Provide useful operation identities, original and recovery causes, safe public messages, and telemetry without exposing sensitive values.",
      "Failure evidence: UNDECIDED. Demonstrate representative interruption and recovery paths and align runbooks, alerts, and operator actions with the actual remaining state.",
    ],
  },
};
