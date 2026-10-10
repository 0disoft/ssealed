import type { TopicContract } from "./contract.js";

export const workerServiceTopics: Readonly<Record<string, TopicContract>> = {
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
};
