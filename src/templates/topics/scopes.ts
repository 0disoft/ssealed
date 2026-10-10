import type { TopicContract } from "./contract.js";
import { mobileAppTopics } from "./mobile-app.js";
import { infraModuleTopics } from "./infra-module.js";
import { dataPipelineTopics } from "./data-pipeline.js";

function scopeContract(topic: TopicContract | undefined, source: string): TopicContract {
  if (topic === undefined) throw new Error(`Missing shared topic for scope source ${source}.`);
  return { ...topic, source };
}

export const scopeTopics: Readonly<Record<string, TopicContract>> = {
  "docs/mobile/README.md": {
    purpose: "Orient contributors to the mobile-owned user journeys, platform commitments, and local or remote state decisions without taking ownership of backend implementation.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Owned journeys: UNDECIDED. Name supported mobile tasks, user outcomes, entrypoints, exclusions, and the owner of each surface.",
      "Platform commitments: UNDECIDED. Define supported device and platform capabilities, accessibility needs, lifecycle constraints, and fallback when capabilities are unavailable.",
      "Local and remote authority: UNDECIDED. Identify local work, consumed services, identity boundaries, offline conflicts, and the owner that reconciles each fact.",
      "Delivery and recovery: UNDECIDED. Identify release ownership, compatibility assumptions, interrupted-user-work recovery, and evidence required for supported journeys.",
      "Document ownership: UNDECIDED. Assign owners to the decision documents below and keep their detailed policies aligned with this scope boundary.",
    ],
  },
  "docs/infra/README.md": {
    purpose: "Orient contributors to declared resource ownership and the state, environment, and execution boundaries needed for safe infrastructure changes.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Owned resources: UNDECIDED. Identify resources, input and output contracts, consumers, external owners, and changes outside this module's scope.",
      "State and execution authority: UNDECIDED. Name state owners, change executors, credentials, concurrency boundaries, and authority needed for effects.",
      "Environment boundaries: UNDECIDED. Define isolation, supported configurations, shared resources, and effects that cross environment or owner boundaries.",
      "Change and recovery: UNDECIDED. Identify reviewed evidence, drift detection, interruption states, reversible actions, and forward-recovery responsibility.",
      "Document ownership: UNDECIDED. Assign owners to the decision documents below; these scaffolds describe contracts and do not provision resources.",
    ],
  },
  "docs/data/README.md": {
    purpose: "Orient contributors to dataset contracts, publication decisions, and lineage or recovery ownership across the data pipeline boundary.",
    source: "docs/architecture/00-system-boundary.md",
    decisions: [
      "Dataset contracts: UNDECIDED. Name input and output datasets, grain, versions, consumer expectations, and excluded processing responsibilities.",
      "Lineage and ownership: UNDECIDED. Identify authoritative records, transformations, derived copies, and the owner that can change or repair each fact.",
      "Publication authority: UNDECIDED. Define acceptance criteria, quality evidence, rejection or quarantine handling, and who decides data is usable by consumers.",
      "Privacy and recovery: UNDECIDED. Identify retention and deletion responsibility, replay or backfill behavior, and recovery without republishing invalid or deleted records.",
      "Document ownership: UNDECIDED. Assign owners to the decision documents below and keep their detailed policies aligned with the pipeline contract.",
    ],
  },
  "docs/mobile/app-contract.md": {
    purpose: "Define the mobile-owned product surface, user work, and external contracts before choosing an application implementation.",
    source: "docs/mobile/README.md",
    decisions: [
      "Surface boundary: UNDECIDED. Identify owned user journeys, screens, device interactions, and services consumed from other owners.",
      "User work and state: UNDECIDED. Describe draft, loading, completed, empty, error, and interrupted states, including work that must survive relaunch.",
      "External contracts: UNDECIDED. Name authoritative API, identity, and data contracts, compatibility assumptions, and handoff owners.",
      "Device access: UNDECIDED. List required capabilities and define denied, revoked, unavailable, and optional-permission behavior.",
      "Local data authority: UNDECIDED. Identify stored data, offline actions, synchronization responsibility, and sign-out or account-switch cleanup.",
      "Acceptance evidence: UNDECIDED. Select supported user journeys, accessibility requirements, lifecycle failures, and device evidence needed for release.",
    ],
  },
  "docs/mobile/platform-support.md": {
    purpose: "Make platform support an explicit promise about available capabilities and verified user behavior.",
    source: "docs/mobile/README.md",
    decisions: [
      "Support matrix: UNDECIDED. Record operating systems, version ranges, device classes, architectures, and responsible owners.",
      "Capability differences: UNDECIDED. Define unavailable APIs, permission differences, background limits, and user-visible fallback behavior.",
      "Interaction and accessibility: UNDECIDED. Account for input methods, screen sizes, orientation, assistive technology, and text scaling.",
      "Lifecycle constraints: UNDECIDED. Identify platform-specific suspension, termination, resource, network, and storage behavior that affects user work.",
      "Validation coverage: UNDECIDED. Distinguish real-device and simulator evidence, required support rows, untested combinations, and release blockers.",
      "End of support: UNDECIDED. Set review ownership, deprecation notice, minimum-version changes, migration choices, and treatment of unsupported installed clients.",
    ],
  },
  "docs/mobile/offline-and-sync.md": scopeContract(mobileAppTopics["docs/mobile-app/offline-and-sync.md"], "docs/mobile/README.md"),
  "docs/mobile/store-release.md": scopeContract(mobileAppTopics["docs/mobile-app/store-release.md"], "docs/mobile/README.md"),

  "docs/infra/module-contract.md": scopeContract(infraModuleTopics["docs/infra-module/module-interface.md"], "docs/infra/README.md"),
  "docs/infra/environments.md": scopeContract(infraModuleTopics["docs/infra-module/environment-contract.md"], "docs/infra/README.md"),
  "docs/infra/change-plan.md": {
    purpose: "Bind a reviewed infrastructure change to a specific target, execution authority, and observable stop or recovery decision.",
    source: "docs/infra/README.md",
    decisions: [
      "Reviewed change: UNDECIDED. Record the declared source revision, target environment, plan identity, expected effects, and assumptions that can invalidate review.",
      "Affected resources: UNDECIDED. Identify shared dependencies, replacements, durable data, blast radius, service interruption, and changes that cannot be undone.",
      "Apply authority: UNDECIDED. Name the operator and credentials allowed to execute this plan, concurrency controls, approval owner, and separation from preview credentials.",
      "Execution ordering: UNDECIDED. Define prerequisites, backup or restore evidence, dependency order, and handling of partially applied changes.",
      "Stop conditions: UNDECIDED. Choose health signals, unexpected-drift criteria, interruption handling, and the owner who can pause or abandon the change.",
      "Completion and recovery: UNDECIDED. Record observed resource state, validation, unresolved effects, reconciliation steps, and the evidence required before declaring completion.",
    ],
  },
  "docs/infra/drift-and-rollback.md": {
    purpose: "Reconcile declared infrastructure with actual state and distinguish recoverable configuration changes from irreversible resource or data effects.",
    source: "docs/infra/README.md",
    decisions: [
      "Drift inventory: UNDECIDED. Define inspection scope and cadence, authoritative state, accepted exceptions, and owners for unauthorized or destructive differences.",
      "Reconciliation authority: UNDECIDED. Decide who may accept observed state, restore declarations, import resources, or apply emergency overrides with an expiry.",
      "Recovery eligibility: UNDECIDED. Separate reversible configuration from resource replacement, deleted state, incompatible migrations, and durable-data changes that need restoration or forward repair.",
      "Recovery assets: UNDECIDED. Identify state snapshots, retained artifacts, configuration revisions, credentials, and verified backups needed for the chosen recovery path.",
      "Rollback evidence: UNDECIDED. Define a bounded recovery exercise, resource and data verification, acceptable downtime, and evidence that the intended state was restored.",
      "Residual effects: UNDECIDED. Account for partially completed operations, external consumers, new drift introduced by recovery, and ownership of unresolved changes.",
    ],
  },

  "docs/data/pipeline-contract.md": {
    purpose: "Define what a data pipeline consumes, publishes, and guarantees to its downstream owners through ordinary execution and recovery.",
    source: "docs/data/README.md",
    decisions: [
      "Input and output contracts: UNDECIDED. Name authoritative datasets, schemas, row grain, keys, owners, and downstream compatibility promises.",
      "Execution boundary: UNDECIDED. Select batch, streaming, or scheduled operation, trigger ownership, publication points, and the work owned outside this repository.",
      "Delivery semantics: UNDECIDED. Define ordering, deduplication keys, retry identity, acknowledgment, and the effect of repeated or partially completed processing.",
      "Partial completion: UNDECIDED. Specify checkpoints, rejected rows or batches, failure visibility, quarantine authority, and when output may be published.",
      "Replays and corrections: UNDECIDED. Define backfill scope, late data, schema evolution, replacement of published results, and retention or deletion constraints.",
      "Consumer acceptance: UNDECIDED. Set freshness and quality expectations, measured evidence, incident ownership, and notices before changing dataset meaning.",
    ],
  },
  "docs/data/lineage.md": scopeContract(dataPipelineTopics["docs/data-pipeline/lineage.md"], "docs/data/README.md"),
  "docs/data/quality.md": scopeContract(dataPipelineTopics["docs/data-pipeline/quality-gates.md"], "docs/data/README.md"),
  "docs/data/privacy-and-retention.md": scopeContract(dataPipelineTopics["docs/data-pipeline/retention-and-privacy.md"], "docs/data/README.md"),
};
