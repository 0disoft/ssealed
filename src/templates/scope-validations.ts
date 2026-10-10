import type { Scope } from "../core/types.js";
import { frontendApiSource } from "./topics/frontend.js";
import { renderValidationDefinition, type ValidationDefinition } from "./validation-format.js";

type ScopeValidation = Omit<ValidationDefinition, "sources"> & {
  readonly sources: readonly string[] | ((scope: Scope) => readonly string[]);
};

const scopeValidations: Readonly<Record<string, ScopeValidation>> = {
  ".agents/validations/backend-api.md": {
    sources: ["docs/backend/README.md", "api/openapi.yaml", ".agents/checklists/backend-api.md"],
    purpose: "Verify changed owned API contracts, caller authority, and observable effects without treating a valid schema as proof of service behavior.",
    evidence: [
      "Compare affected operations, request and response shapes, public errors, and limits with the owned contract and representative consumer expectations.",
      "For affected access boundaries, observe accepted and rejected callers, resource or tenant isolation, and invalid or excessive inputs at the responsible operation.",
      "For retry-prone effects, verify duplicate and conflicting requests, interruption, and unknown-outcome reconciliation against actual state where implemented.",
      "Check affected consumers and diagnostics for compatibility, useful failure causes, accurate completion, and exclusion of private values; record untested combinations.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/validations/db-migration.md": {
    sources: ["docs/backend/03-persistence-model.md", "docs/backend/07-migration-strategy.md", "db/schema.dbml", ".agents/checklists/db-migration.md"],
    purpose: "Verify data invariants and consumer compatibility through migration and recovery instead of relying only on a completed migration command.",
    evidence: [
      "Compare before-and-after schema and representative data against preserved invariants, constraints, and affected consumer-visible results.",
      "Exercise the affected old and new reader or writer combinations and the intended transition order before claiming cutover compatibility.",
      "Where backfills or concurrent execution change, verify checkpoints, repeated work, interruption, capacity limits, and preservation of valid intervening user changes.",
      "Observe the supported rollback, reconciliation, or forward-repair outcome and remaining state, making irreversible effects and incomplete cleanup explicit.",
    ],
    validations: ["migration-check", "test", "smoke", "check"],
  },
  ".agents/validations/frontend-ui.md": {
    sources: (scope) => ["docs/frontend/FRONTEND_DESIGN.md", "docs/integrations/backend-api.md", frontendApiSource(scope), ".agents/checklists/frontend-ui.md"],
    purpose: "Verify affected rendered tasks, consumed API behavior, state ownership, and usable recovery in the relevant browser environment.",
    evidence: [
      "Observe affected journeys and loading, empty, disabled, failure, and retry states, checking that recoverable input and appropriate feedback remain usable.",
      "Compare actual requests and responses with the selected API contract, including changed rejection, delayed-response, and uncertain-effect handling.",
      "Where asynchronous or persisted state changes, verify that obsolete results and previous account or tenant state cannot replace current intent or leak into another session.",
      "Inspect affected controls, labels, keyboard operation, focus, and dynamic status in the rendered interface; report assistive-technology and environment gaps separately from automated checks.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/validations/mobile-app.md": {
    sources: (scope) => [...(scope === "mobile" ? ["docs/mobile/README.md", "docs/mobile/app-contract.md"] : ["docs/mobile-app/README.md", "docs/mobile-app/app-lifecycle.md"]), ".agents/checklists/mobile-app.md"],
    purpose: "Verify supported device journeys and lifecycle transitions with evidence of preserved user work and actual recovery.",
    evidence: [
      "Exercise affected foreground, suspension, process-loss, and offline transitions on the supported platforms, observing pending work and recoverable local state.",
      "Where synchronization or external effects change, verify conflicts, duplicate replay, interrupted operations, and reconciliation before uncertain work is repeated.",
      "For affected identity or capability boundaries, observe sign-out, account switching, denied or revoked permissions, and deletion across local, queued, and remote state.",
      "Verify affected app and data-version transitions and their recovery limits; distinguish device or installed-app evidence from compilation and untested platform claims.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
  ".agents/validations/infra-change.md": {
    sources: ["docs/infra/README.md", "docs/infra/module-contract.md", ".agents/checklists/infra-change.md"],
    purpose: "Verify infrastructure state and dependent behavior within the authorized environment and resource boundaries.",
    evidence: [
      "Compare declared interfaces and reviewed effects with the selected environment, credential scope, owned state, and observed resources before authorized changes.",
      "Where resource changes or drift handling are affected, inspect actual partial or active state, concurrent-writer behavior, and uncertain outcomes rather than only plan completion.",
      "Verify affected resources and dependent journeys at meaningful observation points, distinguishing delivered artifacts, activation, and readiness.",
      "Where recovery changes, verify retained or shared state and the supported rollback, reconciliation, or forward repair; report irreversible effects and remaining operating work.",
    ],
    validations: ["docs", "smoke", "check"],
  },
  ".agents/validations/data-pipeline.md": {
    sources: (scope) => [...(scope === "data" ? ["docs/data/README.md", "docs/data/pipeline-contract.md"] : ["docs/data-pipeline/README.md", "docs/data-pipeline/lineage.md"]), ".agents/checklists/data-pipeline.md"],
    purpose: "Verify data lineage, publication invariants, and downstream acceptance instead of treating a successful job as proof of correct data.",
    evidence: [
      "Identify representative input and output versions, grain, transformation boundaries, and actual downstream consumers for affected lineage.",
      "Check independent quality and freshness expectations against published results and relevant missing, duplicate, late, invalid, or quarantined data.",
      "Where replay or backfill changes, verify interrupted and concurrent progress, checkpoint recovery, duplicate effects, and preservation of valid existing changes.",
      "Verify affected consumer-visible publication and retention or deletion across derived copies and replay sources, recording partial results and unresolved reconciliation.",
    ],
    validations: ["contract", "test", "smoke", "docs", "check"],
  },
};

export function renderScopeValidation(filePath: string, title: string, scope: Scope): string | undefined {
  if (!Object.hasOwn(scopeValidations, filePath)) return undefined;
  const validation = scopeValidations[filePath];
  if (validation === undefined) return undefined;
  return renderValidationDefinition(title, {
    ...validation,
    sources: typeof validation.sources === "function" ? validation.sources(scope) : validation.sources,
  });
}
