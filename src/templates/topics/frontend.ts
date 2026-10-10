import type { Scope } from "../../core/types.js";
import type { TopicContract } from "./contract.js";

const frontendTopics: Readonly<Record<string, TopicContract>> = {
  "docs/integrations/backend-api.md": {
    purpose: "Define how the frontend consumes the API contract and maps requests, responses, and uncertain outcomes into user-visible behavior.",
    decisions: [
      "Contract provenance: UNDECIDED. Identify the API owner, authoritative version, update mechanism, and compatibility assumptions before relying on the scaffold contract.",
      "Client mapping: UNDECIDED. Map frontend actions to requests, validation, response interpretation, and user-visible rejection or recovery.",
      "Caller context: UNDECIDED. Define identity and tenant propagation without treating frontend visibility or controls as server-side permission enforcement.",
      "Unknown outcomes: UNDECIDED. Define timeout, cancellation, duplicate requests, and reconciliation before repeating effects whose completion is not known.",
      "Response application: UNDECIDED. Define current-intent and identity checks, stale-response handling, and preservation of newer user edits.",
      "Consumer evidence: UNDECIDED. Select representative valid, rejected, delayed, and incompatible responses and record evidence of agreement with the API owner.",
    ],
  },
  "contracts/backend-api/README.md": {
    purpose: "Describe the provenance and maintenance of the consumed backend contract without taking ownership of backend implementation or silently editing a copied contract as server authority.",
    source: "docs/integrations/backend-api.md",
    decisions: [
      "Contract provenance: UNDECIDED. Identify the upstream owner, source location, version or artifact identity, and when the consumer copy was obtained.",
      "Copy ownership: UNDECIDED. Define how contracts/backend-api/openapi.yaml is refreshed and how reviewed consumer-specific notes remain separate from upstream facts.",
      "Examples and assumptions: UNDECIDED. Identify which example responses are authoritative, illustrative, or incomplete and avoid accepting scaffold placeholders as server behavior.",
      "Compatibility evidence: UNDECIDED. Check consumed operations, response interpretation, errors, and update effects against the upstream contract and supported clients.",
      "Disagreement handling: UNDECIDED. Name the owner and coordination path when the consumer copy, actual service, or client assumptions diverge.",
    ],
  },
  "docs/frontend/accessibility.md": {
    purpose: "Define accessible completion and recovery for supported frontend tasks, with explicit semantics, keyboard behavior, focus, and evidence limitations.",
    source: "docs/frontend/FRONTEND_DESIGN.md",
    decisions: [
      "Semantic controls: UNDECIDED. Identify native controls, accessible names, visible labels, landmarks, headings, and alternatives for non-text content.",
      "Keyboard and focus: UNDECIDED. Define task paths, focus order and return, visible focus, modal boundaries, and alternatives to pointer-only interactions.",
      "Forms and errors: UNDECIDED. Define field labels, instructions, grouped controls, error associations, correction paths, and focus after a failed submission.",
      "Dynamic status: UNDECIDED. Specify how loading, validation, errors, and completed actions are announced without disrupting the user's current task.",
      "Display and motion: UNDECIDED. Record zoom, text scaling, responsive content, contrast, and reduced-motion behavior for supported tasks.",
      "Evidence limits: UNDECIDED. Separate automated checks from keyboard, assistive-technology, and rendered evidence; record supported environments and remaining gaps.",
    ],
  },
  "docs/frontend/state-and-cache.md": {
    purpose: "Assign state authority and lifetime, and keep cache reuse and asynchronous responses consistent with identity, current user intent, and recoverable work.",
    source: "docs/frontend/FRONTEND_DESIGN.md",
    decisions: [
      "State authority: UNDECIDED. Assign server, URL, form, local UI, and shared client state to one owner and distinguish authoritative facts from projections.",
      "Cache identity and lifetime: UNDECIDED. Define keys, versions, freshness, invalidation, retention, and the meaning of unavailable or stale cached data.",
      "Response freshness: UNDECIDED. Define operation or view identity checks at application time so an older response does not replace newer intent or user edits.",
      "Identity isolation: UNDECIDED. Specify tenant and account boundaries, sign-out or switch cleanup, and behavior in other tabs or persisted copies.",
      "Optimistic and partial changes: UNDECIDED. Define provisional state, confirmed effects, conflict handling, reconciliation, and what cancellation can actually undo.",
      "Recovery and evidence: UNDECIDED. Preserve recoverable drafts through failures and select delayed-response, identity-switch, stale-cache, and storage-failure scenarios.",
    ],
  },
};

export function frontendApiSource(scope: Scope): string {
  return scope === "fullstack" ? "api/openapi.yaml" : "contracts/backend-api/openapi.yaml";
}

export function frontendTopicFor(filePath: string, scope: Scope): TopicContract | undefined {
  const topic = frontendTopics[filePath];
  if (topic === undefined) return undefined;
  return filePath === "docs/integrations/backend-api.md" ? { ...topic, source: frontendApiSource(scope) } : topic;
}
