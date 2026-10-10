import type { TopicContract } from "./contract.js";

export const sdkTopics: Readonly<Record<string, TopicContract>> = {
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
};
