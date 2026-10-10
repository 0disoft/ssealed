import type { TopicContract } from "./contract.js";

export const dataPipelineTopics: Readonly<Record<string, TopicContract>> = {
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
};
