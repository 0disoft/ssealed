import type { TopicContract } from "./contract.js";

export const desktopAppTopics: Readonly<Record<string, TopicContract>> = {
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
};
