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
};

export function renderProfileValidation(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(profileValidations, filePath)) return undefined;
  const validation = profileValidations[filePath];
  return validation === undefined ? undefined : renderValidationDefinition(title, validation);
}
