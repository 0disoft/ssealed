import type { TopicContract } from "./contract.js";

export const mobileAppTopics: Readonly<Record<string, TopicContract>> = {
  "docs/mobile-app/app-lifecycle.md": {
    purpose: "Define application state and resource ownership across launch, resume, background execution, and termination.",
    source: "docs/mobile-app/README.md",
    decisions: [
      "Lifecycle states: UNDECIDED. Identify supported transitions and which user work must survive suspension, termination, and relaunch.",
      "Background work: UNDECIDED. Assign scheduling, resource limits, cancellation, and completion ownership for work outside the foreground.",
      "Permission changes: UNDECIDED. Define denied or revoked permissions, settings changes, and recovery without assuming access remains granted.",
      "Identity and resources: UNDECIDED. Specify session renewal, sign-out cleanup, tenant isolation, and release of device or network resources.",
      "Interrupted operations: UNDECIDED. Define durable checkpoints, duplicate prevention, and user-visible recovery after a restart.",
      "Device and platform evidence: UNDECIDED. Select supported environments and lifecycle scenarios that establish the release contract.",
    ],
  },
  "docs/mobile-app/offline-and-sync.md": {
    purpose: "Define local and remote data authority and reconcile offline operations without losing user work or reviving deleted data.",
    source: "docs/mobile-app/README.md",
    decisions: [
      "Offline authority: UNDECIDED. Identify available datasets and actions, local ownership, freshness limits, and unavailable-operation behavior.",
      "Operation identity: UNDECIDED. Define ordering, durable operation identifiers, acknowledgment, and duplicate handling across retries.",
      "Conflict resolution: UNDECIDED. Choose version checks, authoritative values, merge rules, and user choices for unresolved conflicts.",
      "Replay and deletion: UNDECIDED. Account for late writes, deletion markers, replay windows, and prevention of deleted-data resurrection.",
      "Partial failure recovery: UNDECIDED. Describe interrupted synchronization, retry bounds, cache migrations, and preservation of pending operations.",
      "Visibility and verification: UNDECIDED. Expose pending, failed, and completed sync states and identify conflict, deletion, and restart evidence.",
    ],
  },
  "docs/mobile-app/store-release.md": {
    purpose: "Assign ownership and recovery decisions for signed artifacts, store review, promotion, and supported installed versions.",
    source: "docs/mobile-app/README.md",
    decisions: [
      "Artifact identity: UNDECIDED. Record application identifiers, build versions, signing authority, and reproducible artifact evidence.",
      "Review and promotion: UNDECIDED. Choose distribution channels, required review evidence, applicable store prerequisites, and promotion authority.",
      "Runtime and data compatibility: UNDECIDED. Set supported installed versions, service compatibility, and local-data migration constraints.",
      "Rollout and monitoring: UNDECIDED. Define release cohorts, health signals, pause criteria, and the owner who can stop promotion.",
      "Release recovery: UNDECIDED. Plan failed releases, downgrade constraints, forward repairs, and preservation of user data.",
      "User notices: UNDECIDED. Identify permission, privacy, and migration changes that require user-facing explanations before release.",
    ],
  },
};
