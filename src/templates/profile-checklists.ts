import { renderChecklistDefinition, type ChecklistDefinition } from "./checklist-format.js";

const profileChecklists: Readonly<Record<string, ChecklistDefinition>> = {
  ".agents/checklists/cli-tool.md": {
    sources: ["docs/cli/README.md", "docs/cli/command-contract.md"],
    failureModes: "Ambiguous arguments, wrong effective configuration, unintended target effects, corrupt machine-readable output, misleading exit status, and incomplete recovery or cleanup.",
    items: [
      "Argument grammar, defaults, missing or empty values, and interactive versus non-interactive behavior match the affected command contract.",
      "Selected executable, effective configuration, target resolution, and permitted side effects are clear without exposing credentials or private values.",
      "Machine-readable framing, diagnostics, and exit status agree with actual committed effects, interruption, recovery, and cleanup.",
      "Dry-run and repeated execution respect their mutation and recovery boundaries, preserving valid user files and original failure causes.",
      "Relevant installed-entrypoint, argument, configuration, and output-parsing evidence covers supported environments.",
      "Affected failure or cancellation paths report remaining state accurately, with unsupported shells or platforms and delivery gaps explicit.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/checklists/api-service.md": {
    sources: ["docs/api-service/README.md", "docs/api-service/api-lifecycle.md", "api/openapi.yaml"],
    failureModes: "Operation or consumer drift, incorrect caller authority, unsafe retries, incompatible service versions, misleading readiness, and incomplete migration or retirement.",
    items: [
      "Owned operations, consumers, and authoritative schemas agree with actual request, response, error, and effect behavior.",
      "Affected caller and tenant permissions, operation preconditions, and concurrent or duplicate request behavior are enforced at the responsible boundary.",
      "Timeouts, interrupted requests, and unknown outcomes have identity and reconciliation rules before effects are repeated.",
      "Changed service versions, limits, and retry guidance remain compatible with supported consumers or have an explicit transition path.",
      "Declared readiness, actual service activation, and completed operations are distinguished, including affected dependency and shutdown behavior.",
      "Relevant consumer and rejection or recovery evidence supports the change, with remaining rollout, deprecation, and operating work explicit.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/checklists/library-package.md": {
    sources: ["docs/library/README.md", "docs/library/public-api.md"],
    failureModes: "Undeclared exports, mismatched types or defaults, unclear resource ownership, incompatible consumers, missing package artifacts, and incomplete migration guidance.",
    items: [
      "Supported public entrypoints, symbols, declarations, examples, and documented behavior agree without turning internals into public contracts.",
      "Affected defaults, absent-value handling, errors, resource lifetime, concurrency, and side effects preserve the declared caller contract.",
      "Version classification and dependency ranges follow the compatibility policy, with intentional breaking transitions and consumer migration explicit.",
      "Distributed artifacts and package metadata contain the supported public surface for the intended consumer environments.",
      "Representative consumers use the packaged public entrypoints and verify affected type, runtime, and lifecycle behavior.",
      "Deprecation, removal, recovery, and release work account for actual consumers, with untested environments and incomplete obligations recorded.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/checklists/sdk.md": {
    sources: ["docs/sdk/README.md", "docs/sdk/public-api.md"],
    failureModes: "SDK and upstream contract disagreement, wrong caller context, duplicate retries, misleading cancellation, hidden resource leaks, and unsupported consumer or host combinations.",
    items: [
      "Initialization, configuration, public operations, and supported upstream capabilities agree with the SDK's caller contract.",
      "Input, result, error, and evolving-field mapping preserves meaningful upstream behavior instead of silently inventing or dropping information.",
      "Retry, timeout, cancellation, iteration, and cleanup ownership is explicit where affected so wrapper layers do not repeat work or hide incomplete effects.",
      "Credential scope, caller context, and diagnostic redaction preserve the relevant identity and data boundaries where credentials are used.",
      "Installed-consumer evidence covers affected setup, operations, and failure or cancellation behavior against supported upstream versions.",
      "Consumer compatibility, examples, migration, and release claims reflect tested combinations and explicit remaining gaps.",
    ],
    validations: ["lint", "typecheck", "contract", "test", "smoke", "check"],
  },
  ".agents/checklists/worker-service.md": {
    sources: ["docs/worker-service/README.md", "docs/worker-service/job-contract.md"],
    failureModes: "Ambiguous job identity, premature acknowledgment, duplicate external effects, stale-worker authority, unsafe replay, incompatible queued schemas, and hidden exhausted or partial states.",
    items: [
      "Producer authority, job identity, payload version, caller context, and downstream expectations are defined for affected work.",
      "Accepted, running, completed, and failed states agree with actual delivery, ordering, acknowledgment, and effect boundaries.",
      "Concurrent ownership, lease loss, and stale workers cannot bypass the agreed effect authority or take over another worker's state.",
      "Retry budgets, deadlines, cancellation, and unknown outcomes have bounded final states and reconciliation before replay.",
      "Queued-schema evolution, backfill, quarantine, and recovery preserve valid work and distinguish partial effects from completed jobs where affected.",
      "Relevant duplicate-delivery, interruption, stale-owner, and restart evidence supports the change, with remaining job or cleanup work explicit.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
};

export function renderProfileChecklist(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(profileChecklists, filePath)) return undefined;
  const checklist = profileChecklists[filePath];
  return checklist === undefined ? undefined : renderChecklistDefinition(title, checklist);
}
