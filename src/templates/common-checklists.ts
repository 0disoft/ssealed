import { renderChecklistDefinition, type ChecklistDefinition } from "./checklist-format.js";

const commonChecklists: Readonly<Record<string, ChecklistDefinition>> = {
  ".agents/checklists/security.md": {
    sources: ["docs/architecture/00-system-boundary.md", "docs/engineering/00-project-invariants.md"],
    failureModes: "Wrong trust or effect authority, alternate-path access, identity leakage, unsafe input interpretation, excessive capabilities, and sensitive data exposure.",
    items: [
      "Affected assets, trust crossings, caller capabilities, and protected effects are identified from the actual system boundary.",
      "Relevant resource, account, and tenant authority is enforced on every reachable protected path, including rejected or revoked access.",
      "Untrusted input is validated and interpreted as data at the responsible boundary; alternate entrypoints and unsafe output contexts are accounted for.",
      "Credentials and private data have appropriate access, redaction, retention, and deletion boundaries across logs, examples, caches, and artifacts.",
      "External integrations and capabilities stay within the agreed authority, with failure, revocation, and uncertain effects handled where affected.",
      "Evidence covers relevant accepted and rejected cases and the actual exposure path; unverified conditions and remaining risks are explicit.",
    ],
    validations: ["lint", "test", "smoke", "check"],
  },
  ".agents/checklists/performance.md": {
    sources: ["docs/engineering/03-performance-budget.md", "docs/engineering/00-project-invariants.md"],
    failureModes: "Unrepresentative measurements, changed workloads mistaken for improvements, resource pressure, unbounded work, stale cache results, and hidden correctness tradeoffs.",
    items: [
      "The affected journey or hot path, representative workload, supported environment, and relevant resource limits are identified.",
      "Measurements name artifact and environment identity, observation points, units, comparable baseline, and meaningful uncertainty or regression thresholds.",
      "Relevant latency, memory, payload, I/O, or queue evidence covers operating conditions and tails rather than only a favorable average.",
      "Changed concurrency, allocation, caching, or batching preserves agreed correctness, freshness, identity, and lifecycle behavior.",
      "Overload, deadlines, cancellation, and bounded admission or recovery are accounted for where work can outlive its usefulness.",
      "Observed results and tradeoffs support the stated improvement, with unmeasured environments and remaining verification gaps explicit.",
    ],
    validations: ["test", "smoke", "check"],
  },
  ".agents/checklists/ops-change.md": {
    sources: ["docs/ops/00-operational-contract.md", "docs/product/02-spec.md"],
    failureModes: "Declared and active state diverge, uncertain external effects are repeated, recovery is incompatible with data, critical journeys remain broken, and completion is overstated.",
    items: [
      "Affected user journeys, operating owners, declared configuration, and observed active state are identified.",
      "The authorized change, compatibility constraints, stop conditions, and partial states are understood before external effects are applied or repeated.",
      "Rollback, reconciliation, or forward repair matches the effects that can actually be reversed and preserves valid user state.",
      "Relevant configuration, credentials, telemetry, and restore prerequisites have owners and evidence appropriate to the changed behavior.",
      "Critical journeys and intended active behavior are verified; artifact delivery or a healthy process alone is distinguished from successful operation.",
      "Original and recovery failures, mixed or unknown state, and remaining activation or handoff work are reported accurately.",
    ],
    validations: ["docs", "smoke", "check"],
  },
  ".agents/checklists/dependency.md": {
    sources: ["docs/engineering/06-dependency-and-change-policy.md", "docs/engineering/00-project-invariants.md"],
    failureModes: "Unnecessary dependencies, incompatible consumers, unsupported environments, stale update policy, unexplained artifact drift, and costly or incomplete removal.",
    items: [
      "The required capability and affected consumers justify the dependency after considering built-in or existing alternatives.",
      "Runtime or development role, transitive exposure, maintenance ownership, and applicable license requirements are understood.",
      "Selected ranges, lock or build inputs, compatible-update adoption, and intentional major-version transitions follow the project's policy.",
      "Changed API, type, runtime, install, and package behavior is compatible with supported consumers or has an explicit migration path.",
      "Replacement, removal, or recovery accounts for affected data and interfaces rather than assuming a version change can reverse every effect.",
      "Relevant distributed-artifact and consumer checks support compatibility claims, with unsupported combinations and delivery gaps recorded.",
    ],
    validations: ["lint", "typecheck", "test", "check"],
  },
  ".agents/checklists/accessibility.md": {
    sources: ["docs/frontend/FRONTEND_DESIGN.md"],
    failureModes: "Unreachable tasks, unnamed controls, lost or trapped focus, unannounced state, inaccessible correction paths, and automated checks mistaken for user evidence.",
    items: [
      "Affected user tasks and supported access methods have an agreed completion and recovery path.",
      "Controls, labels, headings, landmarks, and non-text alternatives expose appropriate semantics and accessible names.",
      "Keyboard navigation, visible focus, modal boundaries, and focus return preserve the user's place and support relevant tasks without pointer-only requirements.",
      "Forms, grouped fields, instructions, error associations, and correction paths communicate what failed and preserve recoverable input.",
      "Relevant dynamic status, zoom, text scaling, contrast, and motion behavior are verified in supported conditions.",
      "Rendered, keyboard, and assistive-technology evidence is distinguished from automated checks, with untested environments and unresolved barriers explicit.",
    ],
    validations: ["lint", "test", "smoke", "check"],
  },
  ".agents/checklists/release-readiness.md": {
    sources: ["docs/ops/release.md", "docs/ops/rollback.md", "docs/engineering/05-testing-standard.md"],
    failureModes: "Unreviewed or mismatched artifacts, incomplete migration, stale validation, unsafe activation, ineffective recovery, and publication mistaken for delivered behavior.",
    items: [
      "The reviewed revision, version sources, built artifacts, release scope, and delivery owner are identified.",
      "Required evidence covers affected contracts, consumers, and supported environments using the artifacts intended for distribution, with skipped or incomplete checks explicit.",
      "Consumer migration, data compatibility, configuration, and dependency prerequisites are complete or reflected in the delivery sequence.",
      "The task's publication and activation authority, staged rollout, stop conditions, and partial-delivery recovery are respected.",
      "Rollback or forward repair has compatible artifacts and state plus evidence that critical journeys can recover where affected.",
      "Actual delivered or active behavior is verified when delivery is in scope; implementation, publication, activation, and remaining handoff work are reported separately.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
};

export function renderCommonChecklist(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(commonChecklists, filePath)) return undefined;
  const checklist = commonChecklists[filePath];
  return checklist === undefined ? undefined : renderChecklistDefinition(title, checklist);
}
