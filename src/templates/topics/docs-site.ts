import type { TopicContract } from "./contract.js";

export const docsSiteTopics: Readonly<Record<string, TopicContract>> = {
  "docs/docs-site/information-architecture.md": {
    purpose: "Organize documentation around reader tasks with explicit content authority, navigation, and durable addresses.",
    source: "docs/docs-site/README.md",
    decisions: [
      "Reader journeys: UNDECIDED. Identify audiences, prerequisite knowledge, key tasks, and the entry pages that lead to a usable result.",
      "Canonical content: UNDECIDED. Assign authoritative pages for concepts, tutorials, procedures, and reference material without duplicating their contracts.",
      "Navigation and discovery: UNDECIDED. Define hierarchy, labels, cross-links, search coverage, and recovery from empty or irrelevant search results.",
      "Stable addresses: UNDECIDED. Set URL, anchor, rename, redirect, and removed-page policies so existing reader links remain useful.",
      "Version and locale boundaries: UNDECIDED. Define which versions and languages are supported, how readers select them, and how stale variants are marked.",
      "Content ownership: UNDECIDED. Assign page owners, review responsibility, and the process for resolving conflicting or missing information.",
      "Navigation evidence: UNDECIDED. Select reader tasks and link checks that demonstrate discoverability and valid destinations.",
    ],
  },
  "docs/docs-site/publishing.md": {
    purpose: "Define how reviewed documentation becomes an identifiable published artifact with isolated previews and a recovery path.",
    source: "docs/docs-site/README.md",
    decisions: [
      "Publication authority: UNDECIDED. Identify source branches or versions, review requirements, and the owner authorized to promote a release.",
      "Artifact identity: UNDECIDED. Record source revision, build inputs, generated assets, and the evidence linking a published artifact to reviewed content.",
      "Preview isolation: UNDECIDED. Bound preview access, credentials, data, lifetime, and separation from production domains or publishing authority.",
      "Publication prerequisites: UNDECIDED. Define required build, link, example, redirect, and content checks and their failure behavior.",
      "Promotion and rollback: UNDECIDED. Specify promotion steps, partial-publication handling, rollback or forward repair, and verification of the restored content.",
      "Delivery consistency: UNDECIDED. Define base paths, redirects, caching, search-index refresh, and when a publication is considered visible to readers.",
      "Operational ownership: UNDECIDED. Assign publication-failure diagnostics, credential rotation, recovery decisions, and post-publication evidence.",
    ],
  },
  "docs/docs-site/content-quality.md": {
    purpose: "Keep documentation accurate, usable, and verifiable as product behavior, examples, and supported readers change.",
    source: "docs/docs-site/README.md",
    decisions: [
      "Accuracy and freshness: UNDECIDED. Link claims to authoritative behavior or specifications and define review triggers, stale-content notices, and removal criteria.",
      "Executable examples: UNDECIDED. Choose maintained examples, supported environments, prerequisites, and evidence that commands produce the documented result.",
      "Link and asset integrity: UNDECIDED. Specify internal and external link checks, anchor validation, asset availability, and handling of moved or removed targets.",
      "Accessibility and localization: UNDECIDED. Define readable structure, keyboard access where applicable, alternative text, terminology, and translation review ownership.",
      "Sensitive and synthetic content: UNDECIDED. Exclude secrets and private user data and mark sample values, unsupported claims, and incomplete procedures clearly.",
      "Feedback and correction: UNDECIDED. Assign ownership for reader reports, conflicting guidance, urgent corrections, and evidence of resolution.",
      "Quality acceptance: UNDECIDED. Select task-based review and essential automated checks that block misleading content without treating a successful build as proof of accuracy.",
    ],
  },
};
