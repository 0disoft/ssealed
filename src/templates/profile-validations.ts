import { renderValidationDefinition, type ValidationDefinition } from "./validation-format.js";

const profileValidations: Readonly<Record<string, ValidationDefinition>> = {
  ".agents/validations/cli-tool.md": {
    sources: ["docs/cli/README.md", "docs/cli/command-contract.md", ".agents/checklists/cli-tool.md"],
    purpose: "Verify installed command behavior, effective configuration, and accurate effect reporting across affected supported environments.",
    evidence: [
      "Invoke the supported entrypoint with affected arguments, absent or empty values, and configuration precedence, observing the selected target and permitted side effects.",
      "Parse affected machine-readable output according to its framing contract and compare diagnostics and exit status with actual committed, interrupted, or recovered state.",
      "Where mutation or cleanup changes, verify dry-run boundaries, repeated execution, cancellation, and partial failures while preserving user files and original failure causes.",
      "Use the installed or distributed command where packaging is affected and record tested shells, runtimes, configuration inputs, and unsupported combinations.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/validations/api-service.md": {
    sources: ["docs/api-service/README.md", "docs/api-service/api-lifecycle.md", "api/openapi.yaml", ".agents/checklists/api-service.md"],
    purpose: "Verify service consumers and lifecycle behavior against the owned API, including operation completion and compatible transitions.",
    evidence: [
      "Compare affected consumer requests, results, public errors, and limits with the owned API and supported service versions.",
      "For affected operations, observe permitted and rejected caller or tenant contexts, duplicate or conflicting requests, and interrupted or unknown outcomes against actual effects.",
      "Where readiness, dependencies, or shutdown change, verify actual service activation, in-flight work, completion, and remaining recovery instead of relying only on process health.",
      "Check affected consumer compatibility through the intended rollout, migration, or retirement sequence, recording unavailable service combinations and unfinished operating work.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/validations/library-package.md": {
    sources: ["docs/library/README.md", "docs/library/public-api.md", ".agents/checklists/library-package.md"],
    purpose: "Verify the distributed public package in representative supported consumers without relying on private imports or the development source tree.",
    evidence: [
      "Inspect packaged entrypoints, exports, declarations, metadata, and required assets, then consume affected public symbols from the actual artifact.",
      "Compare changed types, defaults, absent values, errors, resource ownership, and lifecycle behavior with the public caller contract.",
      "Where concurrency, cancellation, or cleanup changes, verify meaningful failure and teardown paths and actual retained or released resources.",
      "Verify affected supported consumer and dependency combinations, including required migration or deprecation behavior, and make untested environments or missing release obligations explicit.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/validations/sdk.md": {
    sources: ["docs/sdk/README.md", "docs/sdk/public-api.md", ".agents/checklists/sdk.md"],
    purpose: "Verify packaged SDK behavior against supported upstream contracts while preserving caller context, effect identity, and cleanup ownership.",
    evidence: [
      "Use representative installed consumers for affected initialization, configuration, public operations, and supported upstream version combinations.",
      "Compare request, result, error, and evolving-field mapping with meaningful upstream behavior, checking caller or credential scope and diagnostic redaction where affected.",
      "For affected retries, timeouts, cancellation, iteration, or streaming, observe repeated and interrupted effects, late results, resource release, and unknown-outcome reconciliation.",
      "Distinguish simulated upstream responses from actual integration evidence, recording unsupported host or service combinations and remaining compatibility or migration work.",
    ],
    validations: ["lint", "typecheck", "contract", "test", "smoke", "check"],
  },
  ".agents/validations/worker-service.md": {
    sources: ["docs/worker-service/README.md", "docs/worker-service/job-contract.md", ".agents/checklists/worker-service.md"],
    purpose: "Verify job ownership, acknowledgment, and downstream effects through repeated delivery, interruption, and recovery.",
    evidence: [
      "Compare producer identity, payload versions, job identity, and downstream expectations with affected accepted, running, completed, or failed states.",
      "Where delivery or ownership changes, verify duplicates, competing workers, lease loss, and stale-worker behavior at the actual effect and acknowledgment boundaries.",
      "For affected retry, deadline, cancellation, or restart paths, observe partial effects, unknown outcomes, exhaustion, quarantine, and reconciliation before replay.",
      "Verify queued-schema transitions, backfill, and relevant downstream results, recording retained work, incomplete cleanup, and unsupported producer or consumer combinations.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/validations/desktop-app.md": {
    sources: ["docs/desktop/README.md", "docs/desktop/installers.md", "docs/desktop/auto-update.md", "docs/desktop/local-data.md", ".agents/checklists/desktop-app.md"],
    purpose: "Verify installed application journeys and compatible local state through affected installation, update, interruption, and recovery transitions.",
    evidence: [
      "Compare delivered artifacts, publisher identity, privileges, and owned paths with the installation contract, then observe affected installed-app behavior on supported platforms.",
      "Where install, repair, update, or removal changes, verify partial or interrupted transitions and preservation of user data and shared components.",
      "For affected app and data versions, verify migration and recovery against actual local state; restoring a binary alone does not establish restored user data.",
      "Observe affected pending work, late completions, closed or replaced views, and resource cleanup, recording actual activation and recovery status separately from build success.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
  ".agents/validations/web-app.md": {
    sources: ["docs/web-app/README.md", "docs/web-app/routing-and-rendering.md", "docs/web-app/browser-state.md", ".agents/checklists/web-app.md"],
    purpose: "Verify browser journeys and recoverable state across affected routing, rendering, loading, and identity transitions.",
    evidence: [
      "Compare affected direct loads, client navigation, and rendering or hydration outcomes against the route contract and actual access, loading, and failure behavior.",
      "For changed asynchronous work, observe delayed or obsolete results and account switches, verifying that current view identity and user intent control state application.",
      "Verify affected form input, focus, scroll, history restoration, storage, and multiple-tab behavior through rejected loads or expired sessions without losing recoverable work.",
      "Inspect relevant rendered and accessible task completion or recovery in supported browsers, distinguishing automated results from actual journeys and untested conditions.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/validations/browser-extension.md": {
    sources: ["docs/browser-extension/README.md", "docs/browser-extension/extension-contract.md", "docs/browser-extension/permissions.md", ".agents/checklists/browser-extension.md"],
    purpose: "Verify extension effects in their actual execution contexts with current capability grants and recoverable state.",
    evidence: [
      "Exercise affected extension UI, background execution, content scripts, and external integrations in supported browsers, recording which context owns each effect.",
      "For changed page or message boundaries, verify relevant callers, origins, frames, untrusted data, and denied or revoked grants at the responsible operation.",
      "Where suspension, restart, update, or migration changes, observe retained state, uncertain effects, and reconciliation before work is replayed.",
      "Verify affected listeners, registrations, pending work, and collected or persisted data through cleanup or deletion, recording unsupported browser and distribution combinations.",
    ],
    validations: ["lint", "test", "smoke", "docs", "check"],
  },
  ".agents/validations/plugin.md": {
    sources: ["docs/plugin/README.md", "docs/plugin/host-contract.md", "docs/plugin/extension-points.md", ".agents/checklists/plugin.md"],
    purpose: "Verify host integration and activation-owned resources through repeated invocation, failure, disable, and unload.",
    evidence: [
      "Exercise affected host interfaces and extension points on supported versions, observing capability denial, activation failure, and relevant host availability.",
      "Where activation or invocation changes, verify repeated or overlapping work and ownership of registrations, listeners, tasks, handles, and persisted state.",
      "Observe disable or unload while work is pending, including late callbacks, and verify that invalidated work cannot change host state while owned resources are released.",
      "Verify affected update or migration preserves valid user configuration, distinguishing requested cancellation from completed teardown and recording remaining cleanup or compatibility gaps.",
    ],
    validations: ["contract", "test", "smoke", "docs", "check"],
  },
  ".agents/validations/infra-module.md": {
    sources: ["docs/infra-module/README.md", "docs/infra-module/module-interface.md", "docs/infra-module/environment-contract.md", ".agents/checklists/infra-module.md"],
    purpose: "Verify module consumers and authorized resource transitions against actual environment and state ownership.",
    evidence: [
      "Compare affected public inputs, outputs, defaults, and consumer configurations with the module interface, including sensitive values and shared-resource boundaries.",
      "Verify the selected environment, credential scope, state authority, and relevant concurrent-writer controls before authorized creation, replacement, import, or removal.",
      "Where resource lifecycle or drift handling changes, inspect actual partial or applied state and affected dependent behavior rather than inferring completion from a successful plan.",
      "Verify supported interface transitions and recovery against retained user or shared state, recording irreversible effects, incompatible consumers, and unresolved reconciliation.",
    ],
    validations: ["contract", "test", "smoke", "check"],
  },
  ".agents/validations/github-action.md": {
    sources: ["docs/github-action/README.md", "docs/github-action/action-contract.md", "docs/github-action/inputs-and-outputs.md", "docs/github-action/permissions.md", ".agents/checklists/github-action.md"],
    purpose: "Verify the action's caller-visible results and runner effects with appropriate input handling, execution authority, and cleanup.",
    evidence: [
      "Exercise affected caller workflows and supported runners with relevant absent, empty, multiline, numeric, boolean, and path inputs, checking actual parsing and output framing.",
      "Verify changed untrusted-event and permission boundaries, including denied authority, keeping contributor data separate from executable syntax and privileged effects.",
      "Where repeated or concurrent execution, cancellation, or failure changes, observe isolated workspace state, actual external effects, output publication timing, exit status, and owned-resource cleanup.",
      "Inspect affected logs, outputs, summaries, caches, and artifacts for unintended credential disclosure, and record caller compatibility, untested matrix entries, and incomplete recovery.",
    ],
    validations: ["lint", "contract", "test", "smoke", "check"],
  },
  ".agents/validations/docs-site.md": {
    sources: ["docs/docs-site/README.md", "docs/docs-site/information-architecture.md", "docs/docs-site/publishing.md", ".agents/checklists/docs-site.md"],
    purpose: "Verify accurate reader guidance and usable navigation, with visible-content evidence when publication is authorized and in scope.",
    evidence: [
      "Compare affected claims, prerequisites, examples, and procedures with authoritative product behavior, identifying drafts, stale versions or translations, and private values.",
      "Follow relevant reader journeys through navigation, search, links, anchors, and assets, checking moved or removed addresses and accessible task completion where affected.",
      "For authorized publication changes, verify reviewed source and artifact identity, preview isolation, promotion prerequisites, and partial-publication recovery.",
      "Observe affected published pages, base paths, redirects, cache visibility, and search state before claiming delivery; distinguish content review and build results from actual publication.",
    ],
    validations: ["docs", "test", "smoke", "check"],
  },
  ".agents/validations/monorepo.md": {
    sources: ["docs/monorepo/README.md", "docs/monorepo/workspace-boundaries.md", "docs/monorepo/package-ownership.md", ".agents/checklists/monorepo.md"],
    purpose: "Verify affected package and consumer contracts in dependency order without assuming root success or atomic releases establish independent package usability.",
    evidence: [
      "Identify affected package owners, public surfaces, allowed dependency edges, and direct or transitive consumers of shared tooling, configuration, or schemas.",
      "Run relevant package and consumer checks against actual artifacts in prerequisite order, exposing private cross-package imports and hidden root or sibling assumptions.",
      "Where concurrent tasks or shared outputs change, verify artifact and mutable-cache ownership, isolation, and preservation of independently valid package work.",
      "Check required old and new consumer combinations through the intended version, migration, and release sequence, recording partial rollout, recovery limits, and remaining integration or publication work.",
    ],
    validations: ["lint", "typecheck", "contract", "test", "smoke", "check"],
  },
};

export function renderProfileValidation(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(profileValidations, filePath)) return undefined;
  const validation = profileValidations[filePath];
  return validation === undefined ? undefined : renderValidationDefinition(title, validation);
}
