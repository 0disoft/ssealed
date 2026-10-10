import type { TopicContract } from "./contract.js";

export const libraryTopics: Readonly<Record<string, TopicContract>> = {
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
};
