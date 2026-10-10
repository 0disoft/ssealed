import type { TopicContract } from "./contract.js";

export const pluginTopics: Readonly<Record<string, TopicContract>> = {
  "docs/plugin/host-contract.md": {
    purpose: "Define the host-plugin relationship, resource ownership, and observable behavior across activation, failure, and teardown.",
    source: "docs/plugin/README.md",
    decisions: [
      "Host capabilities: UNDECIDED. Identify supported host interfaces, required capabilities, and the authority granted to the plugin.",
      "Activation and teardown: UNDECIDED. Specify initialization, repeated activation, disable or unload behavior, and cleanup completion.",
      "Resource ownership: UNDECIDED. Assign registrations, listeners, tasks, handles, and persisted state to owners with defined release responsibilities.",
      "Failure isolation: UNDECIDED. Define error propagation, host availability, recovery choices, and limits on plugin effects after failure.",
      "Trust and access boundaries: UNDECIDED. Record trusted inputs, granted resources, and any isolation assumptions supplied by the host.",
      "State and updates: UNDECIDED. Define settings authority, state migration, update ordering, and preservation of user data.",
      "Host evidence: UNDECIDED. Select activation, denied-capability, interruption, failure, and teardown scenarios against supported hosts.",
    ],
  },
  "docs/plugin/extension-points.md": {
    purpose: "Specify each supported extension point without exposing incidental host internals or leaving callback lifetimes ambiguous.",
    source: "docs/plugin/README.md",
    decisions: [
      "Extension point inventory: UNDECIDED. Record supported hooks, commands, providers, and the user operation each one enables.",
      "Registration ownership: UNDECIDED. Define registration identity, duplicate handling, ordering, and unregistration responsibility.",
      "Invocation contract: UNDECIDED. Specify inputs, outputs, asynchronous completion, error propagation, and cancellation for each extension point.",
      "Reentrancy and concurrency: UNDECIDED. Define overlapping invocations, shared state, mutation boundaries, and ordering guarantees.",
      "Callback lifetime: UNDECIDED. State when callbacks remain valid, what happens during unload, and how late completions release their resources.",
      "Contract evolution: UNDECIDED. Bound stable extension interfaces, deprecated hooks, unknown capabilities, and migration notices.",
      "Verification evidence: UNDECIDED. Cover duplicate registration, callback failure, concurrent invocation, cancellation, and teardown with pending work.",
    ],
  },
  "docs/plugin/compatibility.md": {
    purpose: "Define which host-plugin combinations are supported and how incompatible capabilities or state changes are handled.",
    source: "docs/plugin/README.md",
    decisions: [
      "Compatibility matrix: UNDECIDED. Record supported host versions, plugin versions, runtimes, and relevant platform combinations.",
      "Capability negotiation: UNDECIDED. Distinguish required and optional capabilities and define behavior for unknown or unavailable host features.",
      "Compatibility promise: UNDECIDED. Classify breaking changes to interfaces, observable behavior, configuration, and persisted state.",
      "Dependency boundaries: UNDECIDED. Define ownership of shared dependencies and prevent assumptions about private host modules.",
      "Migration and rollback: UNDECIDED. Specify upgrade ordering, schema transitions, downgrade constraints, and preservation of user state.",
      "Unsupported combinations: UNDECIDED. Choose rejection or reduced functionality and provide actionable diagnostics without partial activation.",
      "Release evidence: UNDECIDED. Identify representative host fixtures, critical extension scenarios, and the owner who approves compatibility changes.",
    ],
  },
};
