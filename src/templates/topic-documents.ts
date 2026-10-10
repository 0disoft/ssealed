import { documentMetadata } from "./document-format.js";
import type { Profile } from "../core/types.js";

interface TopicContract {
  readonly purpose: string;
  readonly decisions: readonly string[];
  readonly source?: string;
}

const topicContracts: Readonly<Record<string, TopicContract>> = {
  "docs/worker-service/job-contract.md": {
    purpose: "Define what a job means to its producer, worker, and downstream consumers throughout delivery and completion.",
    source: "docs/worker-service/README.md",
    decisions: [
      "Job envelope: UNDECIDED. Specify identity, payload schema and version, tenant context, correlation, and required metadata.",
      "Preconditions and authority: UNDECIDED. Define who may submit a job and which state must hold before execution.",
      "Delivery and acknowledgment: UNDECIDED. State delivery guarantees, ordering, and when a worker may acknowledge receipt or completion.",
      "Completion and side effects: UNDECIDED. Distinguish accepted, running, completed, and failed states and their observable effects.",
      "Cancellation and timeouts: UNDECIDED. Define deadline expiry, cancellation ownership, and the state left after interruption.",
      "Schema evolution: UNDECIDED. Explain how old queued jobs are accepted, migrated, or isolated after a contract change.",
    ],
  },
  "docs/worker-service/retry-and-idempotency.md": {
    purpose: "Specify safe repeated execution when delivery, ownership, or downstream effects fail independently.",
    source: "docs/worker-service/README.md",
    decisions: [
      "Retryable failures: UNDECIDED. Classify transient, permanent, and unknown outcomes without treating every failure as safe to retry.",
      "Retry budget and timing: UNDECIDED. Define attempt limits, backoff, jitter, deadlines, and the final exhausted state.",
      "Deduplication scope: UNDECIDED. Bind job identity to tenant and operation, compare payloads, and set the retention window.",
      "Concurrent ownership: UNDECIDED. Define lease renewal, stale workers, and prevention of competing side effects.",
      "Outcome and acknowledgment atomicity: UNDECIDED. State how persisted completion relates to external effects and queue acknowledgment.",
      "Replay and recovery: UNDECIDED. Define repair authority and evidence before replaying jobs with partial or unknown outcomes.",
    ],
  },
  "docs/worker-service/queue-operations.md": {
    purpose: "Make queue capacity, worker readiness, and failure recovery observable and operable by named owners.",
    source: "docs/worker-service/README.md",
    decisions: [
      "Backlog signals: UNDECIDED. Define depth, oldest-job age, arrival and completion rates, and alert thresholds.",
      "Capacity and fairness: UNDECIDED. Set concurrency, scaling limits, tenant isolation, and protection of downstream dependencies.",
      "Poison jobs: UNDECIDED. Define isolation, dead-letter routing, inspection, retention, and replay authority.",
      "Readiness and dependencies: UNDECIDED. Specify when workers may accept work and how dependency outages affect consumption.",
      "Shutdown and draining: UNDECIDED. Define graceful stop, in-flight ownership transfer, and evidence that work is not silently abandoned.",
      "Operational recovery: UNDECIDED. Assign owners for stalled consumers, broker outages, queue restoration, and reconciliation.",
    ],
  },
  "docs/infra-module/module-interface.md": {
    purpose: "Define the module's owned resources and public interface without hiding shared-resource or state authority.",
    source: "docs/infra-module/README.md",
    decisions: [
      "Module boundary: UNDECIDED. Inventory owned resources, external dependencies, and shared surfaces the module must not take over.",
      "Inputs and outputs: UNDECIDED. Specify types, defaults, validation, sensitive values, and stable consumer-facing outputs.",
      "State authority: UNDECIDED. Identify state ownership, concurrency controls, access rights, and recovery authority.",
      "Lifecycle transitions: UNDECIDED. Describe creation, change, replacement, import, and removal with their expected effects.",
      "Destructive-change policy: UNDECIDED. Identify irreversible operations, review authority, and recovery limits.",
      "Compatibility evidence: UNDECIDED. Define interface evolution and consumer checks needed before a module release.",
    ],
  },
  "docs/infra-module/environment-contract.md": {
    purpose: "Explain how an environment obtains reviewed configuration and authority while remaining isolated from other environments.",
    source: "docs/infra-module/README.md",
    decisions: [
      "Environment isolation: UNDECIDED. Map identities, accounts, regions, networks, namespaces, and state boundaries.",
      "Promotion and configuration: UNDECIDED. Define reviewed inputs, precedence, artifact promotion, and permitted environment differences.",
      "Credential authority: UNDECIDED. Name who may plan, apply, or remove resources and how credential references are supplied.",
      "Dependency assumptions: UNDECIDED. Identify external resources, service availability, and prerequisites for provisioning.",
      "Capacity and cost boundaries: UNDECIDED. Record resource limits, ownership, and approval for expanding an environment.",
      "Recovery and teardown: UNDECIDED. Define environment restoration, retained state, and evidence before removing shared or durable resources.",
    ],
  },
  "docs/infra-module/drift-policy.md": {
    purpose: "Define how differences between declared and actual infrastructure are detected, reviewed, and reconciled.",
    source: "docs/infra-module/README.md",
    decisions: [
      "Drift authority: UNDECIDED. Identify the source of truth and who may accept a change or restore declared state.",
      "Detection and classification: UNDECIDED. Set inspection cadence and distinguish expected, ignored, unauthorized, and destructive differences.",
      "Reconciliation policy: UNDECIDED. Decide which changes require review and which, if any, may be corrected automatically.",
      "Emergency changes: UNDECIDED. Define temporary overrides, approval, expiry, and reconciliation back into the declared source.",
      "State conflict and recovery: UNDECIDED. Explain how concurrent changes, imports, lost state, and failed repairs are handled.",
      "Audit evidence: UNDECIDED. Record observed changes, decisions, applied corrections, owners, and unresolved drift.",
    ],
  },
  "docs/data-pipeline/lineage.md": {
    purpose: "Trace a published dataset from authoritative inputs through transformations to consumers with explicit identity and timing rules.",
    source: "docs/data-pipeline/README.md",
    decisions: [
      "Source authority: UNDECIDED. Name input systems, owners, schema versions, and the source of truth for each important field.",
      "Dataset grain: UNDECIDED. Define what one row represents, business keys, duplicates, partitions, and join cardinality.",
      "Transformation lineage: UNDECIDED. Record filters, joins, aggregations, derivations, and dependencies that change meaning.",
      "Event time and freshness: UNDECIDED. Specify clocks, time zones, watermarks, ingestion delay, and publication expectations.",
      "Late data and backfills: UNDECIDED. Define correction windows, replay scope, ordering, and effects on already published results.",
      "Consumer contracts: UNDECIDED. Identify downstream users, dataset versions, and compatibility notice for changed meaning or schemas.",
    ],
  },
  "docs/data-pipeline/quality-gates.md": {
    purpose: "Make data-quality claims measurable and define what happens when a dataset fails a required gate.",
    source: "docs/data-pipeline/README.md",
    decisions: [
      "Quality dimensions: UNDECIDED. Select completeness, uniqueness, validity, consistency, and freshness checks relevant to consumers.",
      "Thresholds and measurement: UNDECIDED. Define populations, denominators, windows, expected ranges, and acceptable exceptions.",
      "Gate enforcement: UNDECIDED. State which failures block publication, warn, or require an explicit override.",
      "Quarantine and recovery: UNDECIDED. Define isolation of bad rows or batches, repair authority, replay, and restoration of trusted output.",
      "Drift and false positives: UNDECIDED. Explain schema changes, baseline updates, and review of noisy or obsolete checks.",
      "Evidence and ownership: UNDECIDED. Record gate results, affected consumers, exception expiry, and who resolves a failure.",
    ],
  },
  "docs/data-pipeline/retention-and-privacy.md": {
    purpose: "Define where sensitive data may flow, how long copies remain, and how deletion reaches derived and recovery surfaces.",
    source: "docs/data-pipeline/README.md",
    decisions: [
      "Data classification: UNDECIDED. Identify sensitive fields, permitted purposes, and owners across raw and derived datasets.",
      "Access and exposure: UNDECIDED. Define access boundaries, masking, exports, diagnostics, and restrictions on using production data in examples.",
      "Retention clocks: UNDECIDED. Set retention periods, the event that starts each clock, and exception ownership.",
      "Deletion propagation: UNDECIDED. Map deletion to sources, derived tables, indexes, caches, exports, and downstream consumers.",
      "Backup and replay behavior: UNDECIDED. Explain how restoration or backfills avoid reintroducing data already scheduled for deletion.",
      "Verification and exceptions: UNDECIDED. Record deletion evidence, residual copies, approved exceptions, and unresolved gaps.",
    ],
  },
  "docs/library/public-api.md": {
    purpose: "Define what consumers may rely on without exposing internal implementation choices as permanent public contracts.",
    source: "docs/library/README.md",
    decisions: [
      "Supported entry points: UNDECIDED. Identify public import paths, symbols, and the boundary with internal APIs.",
      "Inputs and defaults: UNDECIDED. Specify valid arguments, units, defaults, and missing, empty, or null behavior.",
      "Outputs and errors: UNDECIDED. Define result types, failure categories, and state remaining after failure.",
      "Ownership and lifecycle: UNDECIDED. Explain resource creation, disposal, caller responsibilities, and valid call ordering.",
      "Concurrency and side effects: UNDECIDED. State sharing rules, argument mutation, asynchronous behavior, and external effects.",
      "Types and documentation: UNDECIDED. Identify the authoritative declarations and consumer examples that describe the contract.",
    ],
  },
  "docs/library/semver.md": {
    purpose: "Connect release versions to an explicit compatibility promise and evidence about changes consumers can observe.",
    source: "docs/library/README.md",
    decisions: [
      "Compatibility promise: UNDECIDED. State which public behaviors, types, and artifacts the version policy protects.",
      "Change classification: UNDECIDED. Classify source, binary, runtime, error, and default-behavior changes, including behavior corrections.",
      "Prerelease policy: UNDECIDED. Define unstable surfaces, preview expectations, and promotion criteria.",
      "Deprecation and removal: UNDECIDED. Set notice periods, replacements, migration guidance, and ownership.",
      "Dependency change policy: UNDECIDED. Define compatible update ranges and evidence required before advancing major versions.",
      "Release identity and notes: UNDECIDED. Identify version sources, artifact identity, tags, and consumer-visible release notes.",
      "Validation gate: UNDECIDED. Select consumer checks that justify the promised compatibility of a release.",
    ],
  },
  "docs/library/compatibility.md": {
    purpose: "Describe supported consumer environments and how compatibility is demonstrated using the distributed library.",
    source: "docs/library/README.md",
    decisions: [
      "Consumer matrix: UNDECIDED. List supported languages, toolchains, runtimes, operating systems, and architectures.",
      "Binary and module contracts: UNDECIDED. Define linkage, import formats, and loading expectations where applicable.",
      "Data and behavior compatibility: UNDECIDED. Cover persisted formats, observable results, errors, and assumptions shared with older consumers.",
      "Dependency constraints: UNDECIDED. State runtime, peer, and optional dependency ranges and required integration evidence.",
      "Compatibility evidence: UNDECIDED. Select installed-consumer journeys and representative old and new environments.",
      "Support windows: UNDECIDED. Assign support ownership, compatibility floors, and notice before retiring an environment.",
    ],
  },
  "docs/library/package-surface.md": {
    purpose: "Specify the artifact consumers install, including its entry points, required files, dependencies, and installation effects.",
    source: "docs/library/README.md",
    decisions: [
      "Published contents: UNDECIDED. Inventory required runtime files, declarations, documentation, assets, and excluded source or cache files.",
      "Entry-point metadata: UNDECIDED. Map declared imports, executables, types, or native interfaces to files present in the artifact.",
      "Dependency surface: UNDECIDED. Identify bundled, runtime, peer, and optional dependencies and which are supplied by consumers.",
      "Installation behavior: UNDECIDED. State lifecycle hooks, native build steps, platform requirements, and other installation side effects.",
      "Artifact validation: UNDECIDED. Inspect the packed artifact and verify critical consumer journeys from an installed copy.",
      "Package identity and promotion: UNDECIDED. Assign the name, registry, version, integrity evidence, and release authority.",
    ],
  },
  "docs/library/migration-guide.md": {
    purpose: "Give consumers an ordered path from old usage to the new contract, including state conversion and recovery limits.",
    source: "docs/library/README.md",
    decisions: [
      "Change inventory: UNDECIDED. List affected APIs, types, defaults, errors, data formats, and compatibility floors.",
      "Before and after usage: UNDECIDED. Provide examples for affected operations and identify removed or renamed behavior.",
      "Migration ordering: UNDECIDED. State prerequisites, dependency changes, conversion steps, and any staged adoption requirements.",
      "State conversion: UNDECIDED. Define how existing persisted state is recognized, transformed, and validated where applicable.",
      "Recovery and rollback: UNDECIDED. Describe partial-migration recovery and when older consumers can still read converted state.",
      "Completion evidence: UNDECIDED. Tell consumers how to verify migration and identify unsupported cases requiring manual work.",
    ],
  },
  "docs/sdk/public-api.md": {
    purpose: "Describe the SDK's caller contract, including setup, operations, results, and behavior when underlying work cannot complete.",
    source: "docs/sdk/README.md",
    decisions: [
      "Initialization and configuration: UNDECIDED. Define setup, defaults, backend selection, and credentials where applicable.",
      "Operation mapping: UNDECIDED. Map public methods to supported capabilities and explain the caller's responsibility for side effects.",
      "Inputs and outputs: UNDECIDED. Specify argument types, units, defaults, result shapes, and absent-value behavior.",
      "Errors and cancellation: UNDECIDED. Define stable failures, timeout budgets, retry ownership, and state after cancellation.",
      "Iteration and long operations: UNDECIDED. Where applicable, define pagination, job status, resource lifetime, and cleanup.",
      "Credentials and diagnostics: UNDECIDED. Define credential scope, diagnostic context, and sensitive fields that must be redacted.",
    ],
  },
  "docs/sdk/compatibility.md": {
    purpose: "Separate the SDK's public compatibility promise from changes in the host, service, or library it integrates with.",
    source: "docs/sdk/README.md",
    decisions: [
      "Supported environments: UNDECIDED. List consumer languages, toolchains, runtimes, and platforms with their support owners.",
      "Upstream interface versions: UNDECIDED. Record supported host, service, or library versions and capability negotiation where applicable.",
      "Public API compatibility: UNDECIDED. Define changes to source usage, types, defaults, errors, and serialization that require consumer migration.",
      "Unknown capabilities and fields: UNDECIDED. Explain how evolving interfaces are handled without silently losing information.",
      "Dependency updates: UNDECIDED. State compatible update ranges and the checks required before promoting a new major dependency.",
      "Consumer evidence and retirement: UNDECIDED. Verify installed-package journeys and define notice before removing support.",
    ],
  },
  "docs/sdk/examples-and-samples.md": {
    purpose: "Keep examples usable by real consumers and synchronized with the published SDK rather than repository internals.",
    source: "docs/sdk/README.md",
    decisions: [
      "Scenario inventory: UNDECIDED. Select setup, successful operations, failures, and cancellation scenarios relevant to consumers.",
      "Public import rules: UNDECIDED. Use published entry points and state the compatible SDK version and environment for each example.",
      "Credentials and cleanup: UNDECIDED. Use secret references, explain side effects, and define cleanup of resources created by samples.",
      "Execution evidence: UNDECIDED. Choose offline fixtures or controlled integrations and record expected outputs and failures.",
      "Example synchronization: UNDECIDED. Assign owners and update examples when public methods, types, or compatibility claims change.",
      "Onboarding gaps: UNDECIDED. Identify prerequisites and steps a new consumer needs without access to internal repository tooling.",
    ],
  },
  "docs/desktop/installers.md": {
    purpose: "Define installation, upgrade, repair, and removal behavior for each supported desktop distribution.",
    source: "docs/desktop/README.md",
    decisions: [
      "Distribution matrix: UNDECIDED. Record OS versions, architectures, installer formats, delivery channels, and their owners.",
      "Artifact trust: UNDECIDED. Define publisher identity, signature verification, artifact sources, and rejection of untrusted packages.",
      "Privileges and paths: UNDECIDED. Choose per-user or system installation, required permissions, paths, and elevation behavior.",
      "Upgrade and repair: UNDECIDED. Specify existing-version detection, configuration preservation, and repair of partial installations.",
      "Uninstall and cleanup: UNDECIDED. Distinguish owned artifacts, shared components, user data, and removal consent.",
      "Interrupted installation: UNDECIDED. Define recovery after failure and which system changes can be reversed.",
      "Installation evidence: UNDECIDED. Select platform checks for clean install, upgrade, repair, uninstall, and refused privileges.",
    ],
  },
  "docs/desktop/auto-update.md": {
    purpose: "Describe how updates reach users, change installed state, and recover without silently discarding incompatible local data.",
    source: "docs/desktop/README.md",
    decisions: [
      "Release channels and rollout: UNDECIDED. Define eligibility, rollout cohorts, pause conditions, and channel changes.",
      "Metadata and artifact trust: UNDECIDED. Specify authenticity, integrity, freshness, and behavior for revoked or obsolete releases.",
      "Update lifecycle: UNDECIDED. Define check, download, verify, apply, and restart states with observable failures.",
      "Data compatibility: UNDECIDED. Identify migrations and which app versions can read data after an update.",
      "Availability and user control: UNDECIDED. Cover offline use, metered networks, interrupted downloads, deferral, and restart consent.",
      "Recovery and rollback: UNDECIDED. Define partial-apply recovery and when restoring an older version is compatible with local state.",
      "Rollout evidence: UNDECIDED. Assign ownership of failure signals, release suspension, and repair guidance.",
    ],
  },
  "docs/desktop/crash-reporting.md": {
    purpose: "Make crash diagnostics actionable while making collection, transmission, and deletion visible to users.",
    source: "docs/desktop/README.md",
    decisions: [
      "Report scope: UNDECIDED. Specify crash types, process identity, build identifiers, environment fields, and collection limits.",
      "Privacy and consent: UNDECIDED. State opt-in behavior, redaction, and which credentials, user content, or memory data must not be collected.",
      "Symbolication: UNDECIDED. Match reports to build symbols and define who can access diagnostic artifacts.",
      "Delivery and retention: UNDECIDED. Bound offline queues, retries, storage, access, and deletion.",
      "Triage ownership: UNASSIGNED. Define grouping, severity, reproduction evidence, and response ownership.",
      "Recovery experience: UNDECIDED. Explain restart, user-state recovery, and support instructions after a crash.",
      "Diagnostic evidence: UNDECIDED. Select representative reports that verify usefulness and redaction without using private user data.",
    ],
  },
  "docs/desktop/local-data.md": {
    purpose: "Define ownership and recovery of durable local state independently of disposable caches and installed application files.",
    source: "docs/desktop/README.md",
    decisions: [
      "Storage inventory: UNDECIDED. Record data classes, locations, owners, access rights, and durable versus disposable state.",
      "Data schemas and migrations: UNDECIDED. Specify version detection, upgrade transitions, and behavior for unsupported newer data.",
      "Atomicity and concurrency: UNDECIDED. Define consistency boundaries for partial writes and multiple app instances.",
      "Secret lifecycle: UNDECIDED. Choose which values need protected storage and define key access, rotation, and loss recovery.",
      "Backup and restore: UNDECIDED. Describe recoverable state, restore validation, and conflicts with current data.",
      "Corruption handling: UNDECIDED. Define detection, isolation, repair authority, and preservation of data that cannot be repaired.",
      "Retention and uninstall: UNDECIDED. State deletion rules, user consent, and which data survives application removal.",
    ],
  },
  "docs/desktop/os-support.md": {
    purpose: "Make supported environments and degraded behavior explicit enough to guide releases and support decisions.",
    source: "docs/desktop/README.md",
    decisions: [
      "Support matrix: UNDECIDED. List OS versions, architectures, desktop environments, and runtime dependencies.",
      "Unsupported environments: UNDECIDED. Define installation blocks, warnings, feature restrictions, and support expectations.",
      "Filesystem behavior: UNDECIDED. Cover path case, Unicode, path length, links, permissions, and user-visible failures.",
      "OS lifecycle: UNDECIDED. Specify login, logout, suspend, resume, process restart, and multiple-user behavior.",
      "Platform capabilities: UNDECIDED. Define feature availability, permission requests, and degraded behavior when capabilities are absent.",
      "Compatibility evidence: UNDECIDED. Select real environments for critical journeys and set support-retirement notice rules.",
    ],
  },
  "docs/security/desktop-security.md": {
    purpose: "Describe the boundaries between desktop processes, untrusted inputs, local secrets, and privileged system operations.",
    source: "docs/desktop/README.md",
    decisions: [
      "Data classification: UNDECIDED. Identify sensitive local data, secrets, and critical operations with their owners.",
      "Privilege boundaries: UNDECIDED. Map user processes, services, updater components, elevation, and permission decisions.",
      "IPC and external entry points: UNDECIDED. Define peer identity, permitted operations, deep links, and caller validation.",
      "Untrusted content: UNDECIDED. State which files, rendered content, extensions, or network inputs cross process boundaries.",
      "Secret access and artifact trust: UNDECIDED. Define access to credentials and authority to install or update executable content.",
      "Threat scenarios and verification: UNDECIDED. Connect actor capabilities and entry points to impact, controls, evidence, and remaining risk.",
    ],
  },
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

export function renderTopicDocument(filePath: string, title: string, profile?: Profile): string | undefined {
  const topic = topicContracts[filePath];
  if (topic === undefined) return undefined;
  return `# ${title}

${documentMetadata([["Status", "Draft"], ...(profile === undefined ? [] : [["Repository Type", profile] as const])])}

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
