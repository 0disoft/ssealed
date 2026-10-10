import type { TopicContract } from "./contract.js";

export const monorepoTopics: Readonly<Record<string, TopicContract>> = {
  "docs/monorepo/workspace-boundaries.md": {
    purpose: "Define workspace responsibilities and dependency boundaries so shared tooling does not erase package autonomy.",
    source: "docs/monorepo/README.md",
    decisions: [
      "Workspace inventory: UNDECIDED. Record package roots, responsibilities, deployable or publishable units, and intentionally excluded directories.",
      "Dependency direction: UNDECIDED. Define allowed dependency edges, public import boundaries, cycle handling, and restrictions on private cross-package imports.",
      "Shared infrastructure: UNDECIDED. Assign ownership of root tooling, configuration, schemas, and generated assets and identify the packages affected by each shared change.",
      "Build and validation boundaries: UNDECIDED. Specify independent package commands, prerequisites, artifact ownership, and the dependency order needed for verification.",
      "State and resource isolation: UNDECIDED. Bound mutable caches, temporary outputs, environment configuration, and concurrently running package tasks.",
      "Boundary evolution: UNDECIDED. Define extraction, consolidation, package renames, and the evidence required before moving responsibility.",
      "Verification evidence: UNDECIDED. Select dependency checks and representative package operations that expose hidden root or sibling assumptions.",
    ],
  },
  "docs/monorepo/package-ownership.md": {
    purpose: "Assign accountable ownership to each package's public surface, dependencies, release decisions, and maintenance lifecycle.",
    source: "docs/monorepo/README.md",
    decisions: [
      "Package authority: UNDECIDED. Name maintainers, review responsibility, escalation routes, and who can approve changes to each package.",
      "Public surface: UNDECIDED. Identify exports, commands, schemas, artifacts, and compatibility promises consumed outside the package boundary.",
      "Dependency ownership: UNDECIDED. Assign responsibility for shared and package-local dependencies, supported ranges, updates, and conflicting requirements.",
      "Release responsibility: UNDECIDED. Define versioning, publication or deployment authority, consumer notices, and recovery ownership.",
      "Ownership handoff: UNDECIDED. Specify the context, access, open obligations, and acceptance evidence needed when maintainers or package responsibilities change.",
      "Retirement: UNDECIDED. Identify remaining consumers, migration ownership, support deadlines, and the conditions for removing a package.",
      "Acceptance evidence: UNDECIDED. Record the package's required checks, known gaps, and the maintainer who accepts a release or ownership transfer.",
    ],
  },
  "docs/monorepo/change-coordination.md": {
    purpose: "Coordinate changes across package and consumer boundaries without assuming all components are released atomically.",
    source: "docs/monorepo/README.md",
    decisions: [
      "Impact analysis: UNDECIDED. Identify affected packages, transitive consumers, shared artifacts, and externally installed versions before implementation.",
      "Compatibility stages: UNDECIDED. Define transitional interfaces and which old and new producer-consumer combinations must coexist.",
      "Release ordering: UNDECIDED. Set dependency-aware publication, deployment, and migration steps with explicit prerequisites and completion evidence.",
      "Validation scope: UNDECIDED. Choose affected-package checks and representative consumer verification, including shared configuration and lockfile changes.",
      "Concurrent change ownership: UNDECIDED. Assign coordination responsibility for overlapping edits, shared generated outputs, and independently approved releases.",
      "Partial rollout recovery: UNDECIDED. Specify stopping criteria, rollback or forward repair, migration reversibility, and recovery when only some packages are updated.",
      "Consumer communication: UNDECIDED. Assign release notes, deprecation guidance, follow-up ownership, and evidence that required consumers completed the transition.",
    ],
  },
};
