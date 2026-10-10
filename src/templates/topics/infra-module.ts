import type { TopicContract } from "./contract.js";

export const infraModuleTopics: Readonly<Record<string, TopicContract>> = {
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
};
