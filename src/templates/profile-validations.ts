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
};

export function renderProfileValidation(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(profileValidations, filePath)) return undefined;
  const validation = profileValidations[filePath];
  return validation === undefined ? undefined : renderValidationDefinition(title, validation);
}
