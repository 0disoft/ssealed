export function openApiSkeleton(): string {
  return `openapi: 3.1.0
info:
  title: UNDECIDED API
  version: 0.0.0
  description: >-
    Draft only. Record project-approved routes, request and response shapes,
    authentication, authorization, pagination, and retry policies before adoption.
    Empty paths mean no operations have been specified, not that an API is ready.
x-ssealed-status: draft
paths: {}
`;
}

export function dbml(): string {
  return `// Draft only: no persistence model has been adopted.
// UNDECIDED: whether a database is needed, its engine, entities, identities,
// relationships, constraints, and lifecycle. Add only project-approved decisions.
Project undecided {
  Note: 'UNDECIDED persistence contract. No tables or database engine selected.'
}
`;
}

export function apiResponseExample(kind: "success" | "error" | "paginated"): string {
  const decision = kind === "paginated"
    ? "Decide whether pagination is needed and adopt its policy before adding a response example."
    : `Adopt the ${kind} response contract before adding an example payload.`;
  return `${JSON.stringify({ $comment: `UNDECIDED draft placeholder, not an adopted wire format. ${decision}` }, null, 2)}\n`;
}
