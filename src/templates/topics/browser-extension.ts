import type { TopicContract } from "./contract.js";

export const browserExtensionTopics: Readonly<Record<string, TopicContract>> = {
  "docs/browser-extension/extension-contract.md": {
    purpose: "Define the extension's supported browser surfaces, execution contexts, persistent state, and release lifecycle.",
    source: "docs/browser-extension/README.md",
    decisions: [
      "Supported environments: UNDECIDED. Record browser families, versions, distribution channels, and unsupported-environment behavior.",
      "Execution contexts: UNDECIDED. Assign responsibilities to extension UI, background execution, content scripts, and any external integrations.",
      "Lifecycle and storage: UNDECIDED. Define startup, suspension, restart, state authority, schema migration, and uninstall retention choices.",
      "External effects: UNDECIDED. Inventory page changes, network requests, downloads, and user actions that authorize them.",
      "Distribution and updates: UNDECIDED. Specify artifact identity, promotion ownership, compatibility with existing state, and release recovery.",
      "User-visible failures: UNDECIDED. Describe unavailable capabilities, interrupted operations, recovery choices, and preservation of user work.",
      "Verification evidence: UNDECIDED. Select supported-browser scenarios for lifecycle, state migration, page interaction, and updates.",
    ],
  },
  "docs/browser-extension/permissions.md": {
    purpose: "Tie extension capabilities and origin access to user-authorized features, including denied and revoked grants.",
    source: "docs/browser-extension/README.md",
    decisions: [
      "Capability inventory: UNDECIDED. Map each feature to required browser capabilities and justify whether access is essential or optional.",
      "Origin scope: UNDECIDED. Identify allowed origins, paths, frames, and matching rules without granting broader access than the feature needs.",
      "Grant and revocation: UNDECIDED. Define request timing, denied grants, changed settings, and cancellation or cleanup after access is revoked.",
      "Data access and retention: UNDECIDED. Classify page and browser data, restrict collection, and assign retention and deletion ownership.",
      "External integration authority: UNDECIDED. Define authenticated external endpoints or native integrations where used and reject unauthorized callers.",
      "Permission evolution: UNDECIDED. Specify review, user explanations, and migration behavior when an update changes required capabilities.",
      "Verification evidence: UNDECIDED. Cover denied and revoked access, unrelated origins, and features operating with only their required grants.",
    ],
  },
  "docs/browser-extension/content-script-boundaries.md": {
    purpose: "Bound interactions between page-controlled content, content scripts, and privileged extension contexts.",
    source: "docs/browser-extension/README.md",
    decisions: [
      "Injection boundary: UNDECIDED. Specify allowed origins, frames, timing, execution contexts, and conditions that permit page interaction.",
      "Message validation: UNDECIDED. Define message schemas, sender and origin checks, allowed operations, and authorization for privileged effects.",
      "Page-controlled data: UNDECIDED. Treat page values and DOM events as untrusted input and define validation before rendering or privileged use.",
      "DOM ownership: UNDECIDED. Bound nodes, styles, listeners, and observers owned by the extension and define cleanup on navigation or repeated injection.",
      "Operation lifecycle: UNDECIDED. Define request identity, cancellation, timeouts, replay handling, and behavior when either context restarts.",
      "Resource and disclosure limits: UNDECIDED. Bound message volume and payloads and exclude credentials or unrelated page data from responses.",
      "Boundary evidence: UNDECIDED. Cover forged or malformed messages, unrelated frames, repeated injection, navigation, and context termination.",
    ],
  },
};
