import type { TopicContract } from "./contract.js";

export const repositoryGuideTopics: Readonly<Record<string, TopicContract>> = {
  "CONTRIBUTING.md": {
    purpose: "Explain how a contributor proposes and delivers a change against the project's actual ownership, behavior, and review expectations.",
    source: "docs/engineering/00-project-invariants.md",
    decisions: [
      "Contribution boundary: UNDECIDED. Identify supported contributions, owned surfaces, exclusions, and the owner who resolves scope questions.",
      "Proposal and coordination: UNDECIDED. Define how contributors describe the problem, affected consumers, alternatives, and decisions needed before implementation.",
      "Review and evidence: UNDECIDED. Record review ownership, observable acceptance criteria, relevant validation from VALIDATION.md, and how missing evidence is disclosed.",
      "Change presentation: UNDECIDED. Define useful commit or review units, behavior descriptions, documentation updates, and preservation of unrelated project changes.",
      "Delivery ownership: UNDECIDED. Identify who merges, publishes, migrates, or releases a change and the evidence required for those distinct actions.",
    ],
  },
  "DEVELOPMENT.md": {
    purpose: "Record a reproducible local development path from project-owned tools and commands without inventing installation, build, test, or service behavior.",
    source: "VALIDATION.md",
    decisions: [
      "Setup contract: UNDECIDED. Identify supported tools and runtime ranges, dependency installation, required inputs, and environment initialization from actual project configuration.",
      "Command inventory: UNDECIDED. Record exact project-owned command names, working directories, inputs, outputs, and whether a command finishes or starts an ongoing process.",
      "Local evidence: UNDECIDED. Map relevant checks to changed risks and describe reproducible execution, required environment rows, expected results, and known gaps.",
      "State and cleanup: UNDECIDED. Distinguish source, generated output, caches, fixtures, secrets, and mutable external state; define safe setup, reset, and recovery boundaries.",
      "Troubleshooting ownership: UNDECIDED. Record useful diagnostics, missing prerequisites, common failure causes, and the owner of unresolved environment or command problems.",
    ],
  },
};
