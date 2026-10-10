import { renderValidationDefinition, type ValidationDefinition } from "./validation-format.js";

const commonValidations: Readonly<Record<string, ValidationDefinition>> = {
  ".agents/validations/default.md": {
    sources: ["AGENTS.md", "docs/engineering/00-project-invariants.md", "CHECKLIST.md"],
    purpose: "Select evidence for the requested outcome and preserved contracts without treating every available check as mandatory for every change.",
    evidence: [
      "Identify the affected behavior, source of truth, ownership boundaries, and invariants that must survive, then select the relevant task checklist and validation guide.",
      "Use representative inputs and independent expected results for the changed contract; distinguish a demonstrated defect from an unverified assumption or pre-existing failure.",
      "Observe affected success and meaningful rejection, interruption, or recovery paths where behavior changes, choosing configured checks appropriate to their actual risk.",
      "For affected documentation, hygiene, packaging, or consumer surfaces, verify the actual references or artifacts and report untested environments instead of inferring correctness from a passing unrelated command.",
    ],
    validations: ["format", "lint", "typecheck", "test", "docs", "check"],
  },
  ".agents/validations/ops-change.md": {
    sources: ["docs/ops/00-operational-contract.md", "docs/product/02-spec.md", ".agents/checklists/ops-change.md"],
    purpose: "Verify intended active behavior and recoverable state for an authorized operational change, including mixed or uncertain outcomes.",
    evidence: [
      "Compare declared configuration, delivered artifacts, observed active state, and affected user journeys in the selected environment.",
      "Where effects are authorized, verify prerequisites, compatibility, stop conditions, and actual transition results without assuming that retrying an unknown outcome is safe.",
      "Observe affected partial-state recovery, rollback, reconciliation, or forward repair against valid user state and actual recovery prerequisites.",
      "Verify critical journeys at relevant operating boundaries and retain original and recovery failures, remaining activation work, and ownership of unresolved state.",
    ],
    validations: ["docs", "smoke", "check"],
  },
  ".agents/validations/dependency-upgrade.md": {
    sources: ["docs/engineering/06-dependency-and-change-policy.md", "docs/engineering/00-project-invariants.md", ".agents/checklists/dependency.md"],
    purpose: "Verify dependency changes against affected public interfaces, supported consumers, and distributed artifacts rather than relying only on installation success.",
    evidence: [
      "Compare selected ranges, resolved versions, transitive changes, runtime or development roles, and build inputs with the project's update and compatibility policy.",
      "Check affected types, public APIs, defaults, errors, and lifecycle behavior in representative supported consumers, including actual packaged entrypoints where relevant.",
      "Verify meaningful changed failure, install, and recovery paths, making required consumer migration and irreversible state effects explicit.",
      "Inspect resulting artifacts and relevant dependency, license, or environment changes; report unsupported combinations and removal or delivery work that remains.",
    ],
    validations: ["lint", "typecheck", "test", "smoke", "check"],
  },
  ".agents/validations/release-readiness.md": {
    sources: ["docs/ops/release.md", "docs/ops/rollback.md", "docs/engineering/05-testing-standard.md", ".agents/checklists/release-readiness.md"],
    purpose: "Verify an identifiable release candidate and its consumer or recovery obligations while keeping implementation, publication, and activation claims separate.",
    evidence: [
      "Identify the candidate revision, version, artifacts, release contents, and supported environments, tying required checks to those exact inputs.",
      "Verify affected installed or distributed behavior and representative consumer compatibility, including any required schema, configuration, or migration transition.",
      "Check supported recovery using compatible artifacts and state, recording irreversible effects, missing restore prerequisites, and unresolved critical failures.",
      "When delivery is authorized and in scope, observe actual publication or active behavior and critical journeys; otherwise report release readiness and remaining publication, activation, or handoff work explicitly.",
    ],
    validations: ["test", "smoke", "docs", "check"],
  },
};

export function renderCommonValidation(filePath: string, title: string): string | undefined {
  if (!Object.hasOwn(commonValidations, filePath)) return undefined;
  const validation = commonValidations[filePath];
  return validation === undefined ? undefined : renderValidationDefinition(title, validation);
}
