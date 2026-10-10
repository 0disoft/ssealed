import type { TopicContract } from "./contract.js";

export const githubActionTopics: Readonly<Record<string, TopicContract>> = {
  "docs/github-action/action-contract.md": {
    purpose: "Define the action's caller-visible execution contract and bound its effects on the workflow and runner.",
    source: "docs/github-action/README.md",
    decisions: [
      "Execution boundary: UNDECIDED. Specify the action's responsibilities, preconditions, execution model, and supported runner environments.",
      "Workspace effects: UNDECIDED. Inventory files, processes, network calls, caches, and artifacts the action may create or change.",
      "Untrusted contributions: UNDECIDED. Identify contributor-controlled inputs and events, and separate their data from executable commands and privileged effects.",
      "Failure and cleanup: UNDECIDED. Define success, partial completion, cancellation, exit behavior, and cleanup of action-owned resources.",
      "Repeat execution: UNDECIDED. Specify retry safety, concurrent-run isolation, cache identity, and recovery from an interrupted run.",
      "Release compatibility: UNDECIDED. Assign version promotion, breaking-change notices, supported consumers, and rollback responsibility.",
      "Workflow evidence: UNDECIDED. Select caller workflows demonstrating supported runners, permitted effects, failure handling, and cleanup.",
    ],
  },
  "docs/github-action/inputs-and-outputs.md": {
    purpose: "Make action inputs, outputs, and diagnostics predictable for workflow callers without leaking secrets or conflating data with commands.",
    source: "docs/github-action/README.md",
    decisions: [
      "Input schema: UNDECIDED. Record required and optional inputs, defaults, formats, validation, and distinctions between absent and empty values.",
      "Normalization: UNDECIDED. Define boolean, numeric, multiline, and path parsing without relying on implicit string coercion.",
      "Data and command boundaries: UNDECIDED. Specify how input values enter processes and output channels without becoming executable syntax.",
      "Output contract: UNDECIDED. Define output names, formats, size limits, publication timing, and values on partial failure or cancellation.",
      "Secret handling: UNDECIDED. Identify credential inputs and prohibit their disclosure through outputs, logs, summaries, caches, and artifacts.",
      "Evolution: UNDECIDED. Set rules for renamed or removed inputs, changed defaults, output compatibility, and caller migration.",
      "Caller examples: UNDECIDED. Cover omitted, invalid, escaped, multiline, and failed-operation cases with representative workflows.",
    ],
  },
  "docs/github-action/permissions.md": {
    purpose: "Assign the minimum authority required for each action effect and define behavior when that authority is unavailable.",
    source: "docs/github-action/README.md",
    decisions: [
      "Permission inventory: UNDECIDED. Map each repository, workflow, and external-service operation to required authority and its justification.",
      "Credential scope: UNDECIDED. Assign credential source, audience, lifetime, repository or environment scope, and revocation ownership.",
      "Untrusted execution: UNDECIDED. Define permitted behavior for untrusted contributors and prevent privileged credentials from reaching untrusted code.",
      "Privilege transitions: UNDECIDED. Identify approval or promotion boundaries and which execution contexts may perform privileged effects.",
      "Unavailable authority: UNDECIDED. Specify permission-denied diagnostics, safe degradation, and effects that must not proceed.",
      "Credential isolation: UNDECIDED. Bound storage, propagation to child processes, logging, and cleanup of temporary credential material.",
      "Verification and review: UNDECIDED. Assign review ownership and evidence for minimal authority, denied permissions, and changed privilege requirements.",
    ],
  },
};
