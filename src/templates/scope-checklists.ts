import type { Scope } from "../core/types.js";
import { renderChecklistDefinition, type ChecklistDefinition } from "./checklist-format.js";
import { frontendApiSource } from "./topics/frontend.js";

type ScopeChecklist = Omit<ChecklistDefinition, "sources"> & {
  readonly sources: readonly string[] | ((scope: Scope) => readonly string[]);
};

const scopeChecklists: Readonly<Record<string, ScopeChecklist>> = {
  ".agents/checklists/backend-api.md": {
    sources: ["docs/backend/README.md", "api/openapi.yaml"],
    failureModes: "Contract drift, misplaced caller authority, unbounded inputs, duplicate effects, misleading completion, and unsafe error or diagnostic disclosure.",
    items: [
      "The owned API contract agrees with changed operations, inputs, results, and public errors.",
      "Affected caller, resource, and tenant permissions are enforced at the responsible effect boundary, including relevant denial paths.",
      "Input limits, pagination, and compatibility behavior are defined where affected without exposing unbounded work or silently changing consumer assumptions.",
      "Retry-prone or concurrent mutations define effect identity, conflicting reuse, completion, and reconciliation for unknown outcomes.",
      "Public errors and diagnostics preserve useful causes and actual effect state while protecting secrets and private payloads.",
      "Affected consumers and relevant accepted, rejected, interrupted, or recovery paths have evidence or explicit verification gaps.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/checklists/db-migration.md": {
    sources: ["docs/backend/03-persistence-model.md", "docs/backend/07-migration-strategy.md", "db/schema.dbml"],
    failureModes: "Incompatible readers or writers, lost user changes, competing migrations, incomplete backfills, irreversible data effects, and unverified cutover.",
    items: [
      "Schema and data authority, before-and-after invariants, and the state that must survive the migration are identified.",
      "Affected readers and writers have a compatible transition and cutover sequence, including old/new version overlap where required.",
      "Concurrent execution, lock or capacity limits, checkpoints, and resumable backfills are defined where affected.",
      "Recovery distinguishes reversible changes, forward repair, and reconciliation; incomplete recovery preserves original causes and remaining paths.",
      "Before-and-after data checks establish relevant constraints and consumer-visible correctness rather than only command completion.",
      "Cutover and cleanup status are supported by evidence, and remaining deployment, backfill, or recovery work is explicit.",
    ],
    validations: ["migration-check", "test", "smoke", "check"],
  },
  ".agents/checklists/frontend-ui.md": {
    sources: (scope) => ["docs/frontend/FRONTEND_DESIGN.md", "docs/integrations/backend-api.md", frontendApiSource(scope)],
    failureModes: "Route or contract drift, unclear state ownership, stale responses overwriting edits, identity leakage, inaccessible controls, and missing user recovery.",
    items: [
      "Affected tasks, routes, component boundaries, and state owners follow the agreed design and consumed API contract.",
      "Asynchronous results are checked against current view, operation, and user intent before replacing state or form input.",
      "Cache, URL, and persisted state respect account and tenant boundaries without treating client controls as server permission enforcement.",
      "Controls, labels, keyboard behavior, focus, and dynamic status support the affected tasks, with rendered or assistive-technology gaps recorded.",
      "Loading, empty, disabled, rejected, and retry states preserve recoverable user input and provide appropriate completion or recovery feedback.",
      "Relevant interactions and API success, failure, delayed-response, or reconciliation paths have observable evidence.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/checklists/mobile-app.md": {
    sources: (scope) => scope === "mobile" ? ["docs/mobile/README.md", "docs/mobile/app-contract.md"] : ["docs/mobile-app/README.md", "docs/mobile-app/app-lifecycle.md"],
    failureModes: "Unsupported platform behavior, interrupted user work, unsafe replay, sync conflicts, identity leakage, revoked capabilities, and incompatible local-state updates.",
    items: [
      "Supported platforms, lifecycle owners, capabilities, and affected user journeys are identified without assuming scaffold choices are implemented.",
      "Suspension, process loss, interruption, and offline behavior preserve recoverable work and define pending-operation ownership.",
      "Synchronization conflicts and uncertain external effects have operation identity and reconciliation rules before replay.",
      "Sign-out, identity switches, permission revocation, and deletion account for local state, queued work, and remote copies where affected.",
      "Affected app or data-version transitions define compatibility and recovery rather than assuming a binary rollback restores user state.",
      "Relevant device journeys and interruption or recovery paths have supported-platform evidence and explicit gaps.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
  ".agents/checklists/infra-change.md": {
    sources: ["docs/infra/README.md", "docs/infra/module-contract.md"],
    failureModes: "Wrong state or environment authority, shared-resource takeover, competing operators, destructive partial changes, drift, and misleading activation claims.",
    items: [
      "Declared resource interfaces, owned state, external dependencies, and affected user journeys are identified.",
      "Observed active state is distinguished from plans, configuration, and delivered artifacts.",
      "Environment, credential, operator, and shared-resource authority stay within the authorized change boundaries.",
      "Concurrent state writers and destructive effects have isolation, compatibility, and recovery limits appropriate to the change.",
      "Interrupted or partial application and unknown outcomes have observable state and a rollback, reconciliation, or forward-repair path.",
      "Affected resources and dependent journeys have evidence of intended behavior, with mixed state and remaining recovery or activation work explicit.",
    ],
    validations: ["docs", "smoke", "check"],
  },
  ".agents/checklists/data-pipeline.md": {
    sources: (scope) => scope === "data" ? ["docs/data/README.md", "docs/data/pipeline-contract.md"] : ["docs/data-pipeline/README.md", "docs/data-pipeline/lineage.md"],
    failureModes: "Wrong grain or lineage, stale publication, duplicate or invalid data, unsafe replay, incomplete deletion, and job success mistaken for consumer correctness.",
    items: [
      "Dataset grain, schema or version identity, source and output owners, and downstream acceptance are defined.",
      "Lineage and affected input or consumer dependencies agree with the actual transformation and publication boundaries.",
      "Quality and freshness requirements distinguish publishable results from invalid, duplicate, missing, or quarantined data.",
      "Replay, backfill, and concurrent work have identities and progress boundaries that preserve valid existing changes.",
      "Relevant retention, deletion, and identity restrictions cover derived copies and replay sources as well as current output.",
      "Data invariants and downstream behavior have evidence across affected publication, restart, and reconciliation paths, with incomplete or unknown state explicit.",
    ],
    validations: ["contract", "test", "smoke", "docs", "check"],
  },
};

export function renderScopeChecklist(filePath: string, title: string, scope: Scope): string | undefined {
  if (!Object.hasOwn(scopeChecklists, filePath)) return undefined;
  const checklist = scopeChecklists[filePath];
  if (checklist === undefined) return undefined;
  return renderChecklistDefinition(title, {
    ...checklist,
    sources: typeof checklist.sources === "function" ? checklist.sources(scope) : checklist.sources,
  });
}
