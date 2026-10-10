import type { TopicContract } from "./contract.js";

export const webAppTopics: Readonly<Record<string, TopicContract>> = {
  "docs/web-app/routing-and-rendering.md": {
    purpose: "Define how URLs, navigation, rendering, and data loading produce consistent user-visible pages.",
    source: "docs/web-app/README.md",
    decisions: [
      "Route ownership: UNDECIDED. Specify URL and parameter ownership, direct links, canonical routes, and browser history behavior.",
      "Rendering boundary: UNDECIDED. Choose server, client, or static rendering where applicable, including data loading and hydration responsibility.",
      "Access and data boundaries: UNDECIDED. Define authorized views and which data may cross rendering boundaries or appear in URLs.",
      "Navigation failures: UNDECIDED. Describe missing routes, expired sessions, failed loads, retry choices, and user-visible recovery.",
      "State restoration: UNDECIDED. Define scroll, focus, form, and back/forward restoration for supported navigation paths.",
      "Compatibility evidence: UNDECIDED. Identify critical journeys and the direct-load, navigation, and accessibility scenarios that must work.",
    ],
  },
  "docs/web-app/browser-state.md": {
    purpose: "Assign authority and lifetime to browser state, including identity changes, multiple tabs, and failed persistence.",
    source: "docs/web-app/README.md",
    decisions: [
      "State authority: UNDECIDED. Assign each state category to server, URL, memory, session, or durable local storage and define reconciliation.",
      "Persistence and expiry: UNDECIDED. Set lifetimes, cache invalidation, serialization versions, and migration ownership.",
      "Multiple tabs: UNDECIDED. Define synchronization, conflicting edits, lost-update handling, and stale tab behavior.",
      "Identity changes: UNDECIDED. Isolate users and tenants and define cleanup or reassignment during sign-out and account switches.",
      "Sensitive storage: UNDECIDED. Classify persisted fields, restrict credential exposure, and assign access and deletion responsibility.",
      "Recovery: UNDECIDED. Explain offline behavior, corrupt storage, interrupted migrations, and preservation of unsaved user work.",
    ],
  },
  "docs/web-app/frontend-observability.md": {
    purpose: "Measure user-visible failures and performance while bounding telemetry collection, delivery, and operational cost.",
    source: "docs/web-app/README.md",
    decisions: [
      "User journey signals: UNDECIDED. Select availability, latency, and correctness signals for critical user actions and their measurement sources.",
      "Error correlation: UNDECIDED. Connect failures to user actions, build versions, environments, and request identifiers without exposing sensitive data.",
      "Collection boundaries: UNDECIDED. Specify consent, sampling, redaction, excluded fields, retention, and access ownership.",
      "Performance measurement: UNDECIDED. Define units, thresholds, aggregation windows, device cohorts, and evidence gaps.",
      "Diagnostics delivery: UNDECIDED. Bound offline queues, payload sizes, retries, and collection overhead when delivery fails.",
      "Operational response: UNDECIDED. Assign alert ownership, investigation evidence, and actions for sustained user impact.",
    ],
  },
};
