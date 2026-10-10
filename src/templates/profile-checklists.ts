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
  ".agents/checklists/desktop-app.md": {
    sources: ["docs/desktop/README.md", "docs/desktop/installers.md"],
    failureModes: "Untrusted artifacts, wrong install privileges or ownership, incompatible local data, interrupted updates, late work mutating closed views, and unverified installed behavior.",
    items: [
      "Supported platforms, distribution artifacts, publisher authority, required privileges, and owned paths agree with the installation contract.",
      "Install, repair, update, and removal preserve user data and shared components according to the affected lifecycle and retention choices.",
      "Artifact delivery, installed state, and application activation are distinguished, with interrupted or partial transitions and actual recovery limits explicit.",
      "Affected app and data versions are compatible; restoring an older binary is not assumed to restore migrated user state.",
      "Owned resources and pending work have cleanup and application-time identity checks where needed to protect closed or replaced views and recoverable user work.",
      "Relevant installed-application journeys, failures, and recovery have supported-platform evidence, with remaining cleanup or distribution work recorded.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
  ".agents/checklists/web-app.md": {
    sources: ["docs/web-app/README.md", "docs/web-app/routing-and-rendering.md"],
    failureModes: "Direct-load and navigation disagreement, unsafe rendering or URL data, stale responses replacing intent, lost browser state, identity leakage, and inaccessible task recovery.",
    items: [
      "Affected tasks, URL and route owners, rendering choices, and data-loading boundaries match the agreed web application contract.",
      "Direct loads and client navigation preserve compatible access, loading, and error behavior across the relevant rendering boundaries.",
      "Delayed navigation, loading, or hydration results respect current operation, view, and account identity before replacing state or user input.",
      "Affected form, focus, scroll, and back/forward restoration preserves usable tasks and recoverable work through failed loads or expired sessions.",
      "Cache and persisted state account for sensitive data, identity switches, multiple tabs, and failed or stale storage where affected.",
      "Relevant browser journeys and recovery have rendered and accessibility evidence, with automated checks and unsupported environments distinguished.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/checklists/browser-extension.md": {
    sources: ["docs/browser-extension/README.md", "docs/browser-extension/extension-contract.md"],
    failureModes: "Execution-context confusion, excessive or revoked capabilities, untrusted page messages gaining authority, unsafe replay after suspension, and incompatible extension-state updates.",
    items: [
      "Supported browsers, extension UI, background execution, content scripts, and external integrations have explicit responsibilities and lifetimes.",
      "Affected page and message effects are bound to appropriate caller, origin, frame, and current capability grants.",
      "Untrusted page data and denied or revoked access are handled at the responsible boundary without expanding authority to bypass an error.",
      "Suspension, restart, migration, or update preserves appropriate state and reconciles uncertain effects before replay.",
      "Listeners, registrations, pending work, and persisted or collected data have ownership, cleanup, and deletion behavior where affected.",
      "Relevant supported-browser contexts, unrelated origins, denied grants, and interruption paths have evidence, with distribution or compatibility gaps explicit.",
    ],
    validations: ["lint", "test", "smoke", "docs", "check"],
  },
  ".agents/checklists/plugin.md": {
    sources: ["docs/plugin/README.md", "docs/plugin/host-contract.md"],
    failureModes: "Unsupported host assumptions, excessive capabilities, duplicate registrations, ambiguous resource ownership, late callbacks after unload, and incomplete teardown or state migration.",
    items: [
      "Supported host interfaces, capabilities, extension points, and state authority agree with the documented host contract.",
      "Activation owners control their registrations, listeners, tasks, handles, and persisted state without taking over another instance's resources.",
      "Repeated activation, overlapping invocation, and failure preserve the agreed ordering, effect authority, and host availability.",
      "Disable or unload handles pending callbacks and late completions, prevents invalidated work from changing host state, and releases owned resources.",
      "Cancellation requests are distinguished from completed teardown, and affected update or migration preserves valid user configuration and recoverable state.",
      "Relevant host activation, capability denial, failure, and teardown paths have evidence, with unsupported versions and remaining cleanup work explicit.",
    ],
    validations: ["contract", "test", "smoke", "docs", "check"],
  },
  ".agents/checklists/infra-module.md": {
    sources: ["docs/infra-module/README.md", "docs/infra-module/module-interface.md"],
    failureModes: "Incompatible module interfaces, unintended resource replacement, shared-state takeover, wrong environment authority, unmanaged drift, and uncertain or irreversible partial effects.",
    items: [
      "Owned resources, shared dependencies, public inputs and outputs, defaults, and supported consumers agree with the affected module interface.",
      "Reviewed changes identify actual creation, replacement, import, or removal effects, including retained data and irreversible operations.",
      "Target environment, credential scope, state ownership, and concurrent-writer controls are verified before authorized resource changes.",
      "Observed drift and interrupted or partial effects have reconciliation ownership and recovery limits without taking over shared or user-owned state.",
      "Interface and dependency evolution preserves supported consumers or provides an explicit compatibility and migration sequence.",
      "Relevant consumer and lifecycle evidence supports the claimed outcome; successful planning is distinguished from applied state and unresolved recovery.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/checklists/github-action.md": {
    sources: ["docs/github-action/README.md", "docs/github-action/action-contract.md", "docs/github-action/inputs-and-outputs.md"],
    failureModes: "Input or output drift, contributor data becoming executable syntax, excessive credential authority, secret disclosure, conflicting runner state, and misleading partial completion or cleanup.",
    items: [
      "Supported callers, runner environments, execution model, and permitted workspace or external effects agree with the action contract.",
      "Affected absent, empty, multiline, numeric, boolean, and path inputs are parsed explicitly and remain data when passed to commands or output channels.",
      "Contributor-controlled events and code cannot inherit privileged effects beyond the agreed boundary; denied authority has explicit failure behavior.",
      "Credentials and private values stay within their intended scope and are excluded from logs, outputs, summaries, caches, and artifacts.",
      "Concurrent runs, retries, interruption, and cleanup respect owned resources and uncertain effects, with output publication and exit status matching actual completion.",
      "Representative caller workflows cover affected supported runners and rejection or recovery paths, with release compatibility and untested combinations explicit.",
    ],
    validations: ["lint", "contract", "test", "smoke", "check"],
  },
  ".agents/checklists/docs-site.md": {
    sources: ["docs/docs-site/README.md", "docs/docs-site/information-architecture.md"],
    failureModes: "Conflicting or stale guidance, unusable reader journeys, broken addresses or assets, misleading examples, mixed versions or locales, and incomplete or unverified publication.",
    items: [
      "Affected reader tasks, canonical pages, content owners, and supported version or locale boundaries agree with the information architecture.",
      "Claims, prerequisites, examples, and procedures match authoritative product behavior, with draft or unimplemented guidance identified and private values excluded.",
      "Navigation, search, links, anchors, and assets lead to valid destinations; moved or removed content follows the agreed redirect and retention policy.",
      "Relevant reader journeys remain understandable and accessible, including keyboard navigation or alternative text where applicable and stale translation handling.",
      "When publication is authorized, reviewed source, artifact identity, preview isolation, promotion, and partial-publication recovery are accounted for.",
      "Relevant content, link, and example evidence supports accuracy; publication claims additionally cover visible pages, redirects, caches, and search state where affected.",
    ],
    validations: ["docs", "test", "smoke", "check"],
  },
  ".agents/checklists/monorepo.md": {
    sources: ["docs/monorepo/README.md", "docs/monorepo/workspace-boundaries.md"],
    failureModes: "Package authority drift, private cross-package imports, dependency cycles, overlooked shared-change consumers, conflicting artifacts or caches, and incompatible partial releases.",
    items: [
      "Affected package roots, public surfaces, maintainers, nearest working rules, and independent release or deployment units are identified.",
      "Dependency direction and public import boundaries are respected, with affected direct and transitive consumers of shared configuration or schemas accounted for.",
      "Build prerequisites, generated artifacts, temporary outputs, and mutable caches have owners and isolation appropriate to concurrent package tasks.",
      "Coordinated interface, version, and migration changes preserve required old and new consumer combinations through the intended release order.",
      "Interrupted or partial rollout has stopping and recovery decisions that account for external consumers and irreversible state changes where affected.",
      "Relevant package and consumer checks run in dependency order against actual artifacts, with hidden root assumptions and remaining integration or release work explicit.",
    ],
    validations: ["lint", "typecheck", "contract", "test", "smoke", "check"],
  },
};

export function renderProfileChecklist(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(profileChecklists, filePath)) return undefined;
  const checklist = profileChecklists[filePath];
  return checklist === undefined ? undefined : renderChecklistDefinition(title, checklist);
}
