import { documentMetadata } from "./document-format.js";

export function frontendDesignDoc(): string {
  const sections = [
    "0. Decision Summary",
    "1. Product Surface and Scope",
    "2. User Flow Map",
    "3. Routing Contract",
    "4. Page and Layout Model",
    "5. State Ownership Model",
    "6. Data Fetching and Cache Policy",
    "7. Component Boundary Model",
    "8. Design Token Contract",
    "9. Interaction and Accessibility Contract",
    "10. Loading, Empty, Error, and Disabled States",
    "11. Form and Validation Model",
    "12. Responsive and Layout Rules",
    "13. Observability and Analytics",
    "14. Test Strategy",
    "15. Implementation Sequence",
    "16. Open Questions and Decisions Log",
  ];
  return `# Frontend Design

${documentMetadata([["Status", "Draft"]])}

${sections
  .map(
    (section) => `## ${section}

${frontendSectionPrompt(section)}
`,
  )
  .join("\n")}
## State Definitions

- Server State: remote data owned by backend contracts.
- URL State: route, query, and hash data that must survive reload and share links.
- Form State: draft user input owned by a form boundary.
- Local UI State: temporary visual or interaction state owned by one component area.
- Global Client State: client-owned state allowed only by explicit allowlist.

## Global State Allowlist

- Auth session summary when required.
- Current tenant or organization selection when required.
- Feature flags when required.

## Global State Denylist

- Server response copies.
- Form drafts.
- One-off modal state.
- Derived values that can be computed locally.

## Component Layers

app -> pages -> features -> entities -> shared.

Imports may point downward only. Shared must not import entities, features, pages, or app.

## State Categories

Loading, empty, error, and disabled states must be defined per route and per async interaction.

## Accessibility Contract

Keyboard paths, focus movement, visible focus, labels, semantic landmarks, and screen-reader announcements must be explicit before implementation.

## Semantic Token Usage

Use semantic tokens for color, spacing, typography, state, and surface role. Do not hardcode product-specific visual choices here.
`;
}

function frontendSectionPrompt(section: string): string {
  if (section.includes("Decision Summary")) {
    return "Record accepted decisions, rejected options, owners, and remaining UNDECIDED items.";
  }
  if (section.includes("Product Surface")) {
    return "Name the product surface, primary users, entry points, non-goals, and ownership boundary.";
  }
  if (section.includes("User Flow")) {
    return "Map happy paths, failure paths, permission paths, and recovery paths.";
  }
  if (section.includes("Routing")) {
    return "List routes, URL parameters, query parameters, redirects, and not-found behavior.";
  }
  if (section.includes("Page and Layout")) {
    return "Define page shells, persistent regions, scroll behavior, responsive breakpoints, and empty layouts.";
  }
  if (section.includes("State Ownership")) {
    return "Assign Server State, URL State, Form State, Local UI State, and allowed Global Client State.";
  }
  if (section.includes("Data Fetching")) {
    return "Define fetch timing, cache keys, invalidation, retry, optimistic updates, and stale data behavior.";
  }
  if (section.includes("Component Boundary")) {
    return "Describe app/pages/features/entities/shared layers, import direction, and reusable component limits.";
  }
  if (section.includes("Design Token")) {
    return "Name semantic token roles for color, spacing, typography, surfaces, status, and interaction states.";
  }
  if (section.includes("Interaction and Accessibility")) {
    return "Define keyboard paths, focus order, labels, landmarks, announcements, and reduced-motion expectations.";
  }
  if (section.includes("Loading")) {
    return "List loading, empty, error, and disabled states for each route and async action.";
  }
  if (section.includes("Form")) {
    return "Separate client validation, backend validation, error display, dirty state, submit, reset, and recovery.";
  }
  if (section.includes("Responsive")) {
    return "Define width ranges, wrapping rules, long-content behavior, viewport constraints, and safe-area handling.";
  }
  if (section.includes("Observability")) {
    return "Name events, analytics, logs, client errors, performance marks, and privacy limits.";
  }
  if (section.includes("Test Strategy")) {
    return "Map unit, component, route, accessibility, contract, and smoke coverage to user-visible risks.";
  }
  if (section.includes("Implementation Sequence")) {
    return "Break work into safe slices with validation after each slice.";
  }
  return "Track open questions, decision owners, due dates, and decision-reversing evidence.";
}
