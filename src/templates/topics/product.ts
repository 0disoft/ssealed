import type { TopicContract } from "./contract.js";

export const productTopics: Readonly<Record<string, TopicContract>> = {
  "docs/product/00-product-brief.md": {
    purpose: "Identify the user problem and intended outcome before selecting features, implementation details, or delivery dates.",
    source: "README.md",
    decisions: [
      "User outcome: UNDECIDED. State what a user should accomplish and what observable result would make the product useful.",
      "Target users: UNDECIDED. Describe eligible users, their context, current alternatives, and whose needs are outside this product.",
      "Scope and exclusions: UNDECIDED. Name owned problems, explicit non-goals, and external services or teams the product relies on.",
      "Problem evidence: UNDECIDED. Record the observations supporting this need, uncertain assumptions, and how those assumptions can be checked.",
      "Success and constraints: UNDECIDED. Define outcome evidence, time and resource limits, accessibility expectations, and unacceptable side effects.",
      "Decision owner: UNDECIDED. Name who can change the product boundary and when the brief must be reviewed against user evidence.",
    ],
  },
  "docs/product/01-roadmap.md": {
    purpose: "Sequence usable outcomes and learning opportunities without presenting an unverified feature list as a delivery commitment.",
    source: "docs/product/02-spec.md",
    decisions: [
      "Milestone outcomes: UNDECIDED. Define the user result delivered by each milestone and the evidence required to call it usable.",
      "Dependency ordering: UNDECIDED. Identify prerequisites, external owners, compatibility changes, and which work may proceed independently.",
      "Smallest useful release: UNDECIDED. Select an initial usable slice, deferred capabilities, and the consequences of those exclusions.",
      "Capacity and assumptions: UNDECIDED. Record owners, resource limits, uncertain estimates, and target windows separately from commitments.",
      "Learning checkpoints: UNDECIDED. Choose what must be learned from each release before investing in the next milestone.",
      "Stop or revise: UNDECIDED. Define evidence for cancelling, reordering, or narrowing a milestone and who makes that decision.",
    ],
  },
  "docs/product/02-spec.md": {
    purpose: "Translate the accepted product boundary into observable behavior that an implementer and reviewer can assess without inventing missing requirements.",
    source: "docs/product/00-product-brief.md",
    decisions: [
      "Observable behavior: UNDECIDED. Specify eligible actors, starting conditions, inputs, user actions, and externally visible results for each owned scenario.",
      "Acceptance criteria: UNDECIDED. Connect each requirement to an observable result, representative example, and evidence that would disprove completion.",
      "State and data rules: UNDECIDED. Define valid states, transitions, ownership, authorization where applicable, and properties that must remain true.",
      "Failure and recovery: UNDECIDED. Describe invalid input, unavailable dependencies, interruptions, partial completion, and how user work is preserved or recovered.",
      "Contract dependencies: UNDECIDED. Identify authoritative external interfaces, compatibility assumptions, unresolved requirements, and handoff owners.",
      "Change authority: UNDECIDED. Record who accepts a requirement change, which decisions it affects, and what evidence must be updated before release.",
    ],
  },
  "docs/product/03-risk-register.md": {
    purpose: "Track concrete threats to the intended product outcome together with an accountable response and evidence of whether the risk remains open.",
    source: "docs/product/00-product-brief.md",
    decisions: [
      "Risk scenario: UNDECIDED. Give each risk an identity, triggering conditions, affected user outcome, and an observable failure scenario.",
      "Impact and likelihood: UNDECIDED. Record the consequence, exposure or frequency assumptions, supporting evidence, and confidence in the assessment.",
      "Mitigation owner: UNDECIDED. Assign the person responsible for the response, required resources, due condition, and review authority.",
      "Detection and contingency: UNDECIDED. Specify warning signals, what happens if mitigation fails, and the action that limits further harm.",
      "Residual risk and release: UNDECIDED. State what remains possible, who may accept it, and which conditions block or stop release.",
      "Review and closure: UNDECIDED. Set review triggers, evidence needed to close a risk, and when a previously closed risk must be reopened.",
    ],
  },
};
