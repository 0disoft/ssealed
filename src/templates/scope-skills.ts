import type { Scope } from "../core/types.js";
import { renderSkillDefinition, type SkillDefinition } from "./agent-skill-format.js";
import { frontendApiSource } from "./topics/frontend.js";

type ScopeSkill = Omit<SkillDefinition, "sources"> & {
  readonly sources: readonly string[] | ((scope: Scope) => readonly string[]);
};

const scopeSkills: Readonly<Record<string, ScopeSkill>> = {
  "backend-api": {
    description: "Change backend request and response behavior, caller permissions, or effect completion while keeping the owned API contract and consumers consistent.",
    sources: ["docs/backend/README.md", "api/openapi.yaml", ".agents/checklists/backend-api.md"],
    workflow: [
      "Identify the owned operations, authoritative API contract, caller identity, and supported consumers. Resolve scaffold assumptions through the API owner rather than treating placeholders as implemented behavior.",
      "Trace validation, identity, and permission decisions to the protected effect. Check resource and tenant ownership at the responsible boundary instead of relying on client controls or a successful login alone.",
      "Define effect identity, completion, and compatible response or error behavior. Account for concurrent calls, retries, interrupted work, and unknown outcomes before repeating a mutation.",
      "Keep contract schemas, actual behavior, and affected consumers aligned. Verify representative accepted and rejected calls and any relevant partial-effect or reconciliation path.",
    ],
  },
  "db-migration": {
    description: "Change persistent schemas or data through a compatible transition with explicit invariants, reader and writer coordination, and recovery evidence.",
    sources: ["docs/backend/03-persistence-model.md", "docs/backend/07-migration-strategy.md", "db/schema.dbml", ".agents/checklists/db-migration.md"],
    workflow: [
      "Identify the authoritative schema and data owner, before-and-after invariants, affected readers and writers, and the state that must survive the transition. Separate a design scaffold from an executable migration.",
      "Choose a compatible transition and cutover sequence for actual deployment and data constraints. Define concurrent execution ownership, checkpoints, and resumable backfill behavior where work may be interrupted.",
      "Determine which schema and data effects can be reversed and which require forward repair or reconciliation. Preserve user changes and original failures when recovery is incomplete.",
      "Verify resulting data and supported consumer behavior, including relevant old/new version overlap and restart paths. A successful migration command alone does not prove data correctness or completed cutover.",
    ],
  },
  "frontend-ui": {
    description: "Change frontend tasks, rendering, forms, or client state using agreed interaction and API contracts, accessible recovery, and current user intent.",
    sources: (scope) => ["docs/frontend/FRONTEND_DESIGN.md", "docs/integrations/backend-api.md", frontendApiSource(scope), ".agents/checklists/frontend-ui.md"],
    workflow: [
      "Connect the requested UI behavior to supported user tasks, routes, state owners, and existing components. Use the selected API contract and coordinate disagreements with its owner without assuming ownership of a separate backend.",
      "Keep authoritative state separate from client projections. Check view, operation, and account identity when applying asynchronous results so stale responses or cached data do not replace newer intent or user edits.",
      "Use appropriate control semantics, labels, keyboard and focus behavior, and visible loading or error recovery. Preserve recoverable input through failed or interrupted actions and respect the project's design choices.",
      "Demonstrate the affected interaction and recovery paths in relevant supported environments. Distinguish rendered, keyboard, and assistive-technology evidence from automated checks and record remaining gaps.",
    ],
  },
  "mobile-app": {
    description: "Change mobile application behavior, lifecycle, permissions, or offline synchronization with explicit platform support and recoverable user state.",
    sources: (scope) => [
      ...(scope === "mobile" ? ["docs/mobile/README.md", "docs/mobile/app-contract.md"] : ["docs/mobile-app/README.md", "docs/mobile-app/app-lifecycle.md"]),
      ".agents/checklists/mobile-app.md",
    ],
    workflow: [
      "Identify the supported platforms and versions, lifecycle owners, permission or capability contract, and affected user journeys. Follow existing platform choices and distinguish documentation assumptions from device behavior.",
      "Define what survives suspension, process loss, interruption, or offline use. Assign ownership of queued effects and synchronization conflicts, and reconcile uncertain completion before retrying external mutations.",
      "Preserve recoverable user work while isolating account and tenant data. Account for sign-out, identity switches, permission revocation, and deletion across local state, queued work, and remote copies.",
      "Verify relevant supported journeys and interruption or recovery behavior with suitable platform evidence. Keep untested platforms, store delivery, and incomplete synchronization explicit.",
    ],
  },
  "infra-change": {
    description: "Change infrastructure contracts, configuration, or operating state with explicit resource authority, reviewed effects, concurrency, and recovery boundaries.",
    sources: ["docs/infra/README.md", "docs/infra/module-contract.md", ".agents/checklists/infra-change.md"],
    workflow: [
      "Identify declared configuration, actual active resources, state and credential owners, environment boundaries, and affected user journeys. Distinguish a scaffold or plan from applied infrastructure.",
      "Review intended resource effects and compatibility with dependent services. Identify concurrent operators and state writers, and stay within the task's execution authority before applying or repeating changes.",
      "Prepare for partial application, interruption, drift, and unknown external outcomes. Use operation identity and observed state to choose rollback, reconciliation, or forward repair without assuming destructive effects can be undone.",
      "Verify the intended active state and critical dependent behavior. Report mixed or unknown state, remaining recovery work, and delivery gaps rather than treating a successful plan or apply command as complete service evidence.",
    ],
  },
  "data-pipeline": {
    description: "Change data ingestion, transformation, or publication with explicit grain, lineage, consumer quality, replay identity, and retention or deletion behavior.",
    sources: (scope) => [
      ...(scope === "data" ? ["docs/data/README.md", "docs/data/pipeline-contract.md"] : ["docs/data-pipeline/README.md", "docs/data-pipeline/lineage.md"]),
      ".agents/checklists/data-pipeline.md",
    ],
    workflow: [
      "Identify input and output owners, dataset grain, schema or version identity, lineage, and consumer acceptance. Separate illustrative contracts from observed source data and published results.",
      "Define publication quality and freshness requirements and what happens to invalid, missing, duplicate, or late data. Keep quarantine or rejected results distinguishable from data that consumers may rely on.",
      "Assign identities and progress boundaries for replay, backfill, and concurrent work. Preserve valid existing changes, reconcile partial publication, and account for retention or deletion across derived copies and replay sources.",
      "Verify relevant data invariants and downstream behavior across success, restart, and reconciliation paths. A completed job alone does not prove correct lineage, complete publication, or removal of retained data.",
    ],
  },
};

export function renderScopeSkill(name: string, scope: Scope): string | undefined {
  if (!Object.hasOwn(scopeSkills, name)) return undefined;
  const skill = scopeSkills[name];
  if (skill === undefined) return undefined;
  return renderSkillDefinition(name, {
    ...skill,
    sources: typeof skill.sources === "function" ? skill.sources(scope) : skill.sources,
  });
}
