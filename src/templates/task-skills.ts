import { renderSkillDefinition, type SkillDefinition } from "./agent-skill-format.js";

const taskSkills: Readonly<Record<string, SkillDefinition>> = {
  feature: {
    description: "Implement new or expanded product behavior from project requirements, ownership boundaries, and observable acceptance criteria.",
    sources: ["docs/product/02-spec.md", "docs/architecture/00-system-boundary.md"],
    workflow: [
      "Connect the requested behavior to existing requirements and observable acceptance criteria. Identify unresolved product choices rather than inventing a domain or technology stack.",
      "Map affected state, contract owners, and consumers. Identify compatible behavior and the failure or interrupted states the new operation can leave behind.",
      "Choose an implementation and delivery sequence suited to those boundaries. Preserve existing user work and keep derived contracts or documentation aligned with their authority.",
      "Demonstrate the intended user outcome and relevant rejection or recovery behavior. Distinguish completed implementation from remaining integration, migration, or release work.",
    ],
  },
  bugfix: {
    description: "Diagnose and repair observed incorrect behavior using a reproducible trigger, the intended contract, and evidence of actual effects and recovery.",
    sources: ["docs/engineering/00-project-invariants.md", "docs/ops/00-operational-contract.md"],
    workflow: [
      "Establish the failing trigger, environment, selected command or configuration, expected behavior, and observed state. Separate reproducible evidence from suspected causes.",
      "Trace the responsible path and identify the violated contract or invariant. For mutations, distinguish rejected work, committed effects, partial recovery, and unknown outcomes.",
      "Repair the cause while preserving valid user state and unrelated behavior. Keep original and recovery failures visible instead of hiding the symptom or claiming an unobserved rollback.",
      "Use a focused reproduction or regression with an independent expected result. Verify the original trigger and the relevant successful or recovery path before describing the defect as fixed.",
    ],
  },
  refactor: {
    description: "Reorganize implementation responsibilities while preserving agreed observable behavior, ownership, and consumer contracts.",
    sources: ["ARCHITECTURE.md", "docs/engineering/00-project-invariants.md"],
    workflow: [
      "Identify the responsibility or dependency problem and the behavior and contracts that must remain true. Treat intentional behavior changes as separate decisions rather than hiding them in a refactor.",
      "Choose boundaries that reduce duplication or coupling without creating a second authority, moving user-owned state, or imposing an unrelated architecture.",
      "Preserve effect ordering, lifetimes, error propagation, and recovery guarantees across the new boundaries. Update callers and ownership documentation together.",
      "Compare relevant behavior and contract outputs before and after the change. Prefer existing focused evidence over tests that merely mirror the new internal structure.",
    ],
  },
  "ops-change": {
    description: "Change operating configuration, rollout, or recovery behavior with evidence of active state, affected journeys, and reversible or irreversible effects.",
    sources: ["docs/ops/00-operational-contract.md", "docs/ops/rollback.md", ".agents/checklists/ops-change.md"],
    workflow: [
      "Identify the affected user journeys, actual active state, declared configuration, and operating owner. Distinguish an artifact or configuration change from runtime activation.",
      "Map possible partial states and compatibility constraints. Choose rollback, reconciliation, or forward repair according to the effects that can actually be reversed.",
      "Prepare the relevant evidence and stop conditions before the authorized operation. Record outcomes and do not repeat an uncertain external effect without checking its identity and state.",
      "Verify the intended active behavior and critical journeys. Report remaining mixed or unknown state, recovery responsibility, and the evidence used to decide that the change succeeded.",
    ],
  },
  "dependency-upgrade": {
    description: "Select, update, or remove a dependency based on necessity, supported compatibility, reproducible evidence, and replacement or recovery cost.",
    sources: ["docs/engineering/06-dependency-and-change-policy.md", ".agents/checklists/dependency.md"],
    workflow: [
      "Establish the dependency's role, consumers, selected version range, lock or build behavior, and reason for the change. Consider built-in or existing alternatives where they meet the requirement.",
      "Use the project's compatibility-update policy. Identify deliberate major-version transitions, affected runtime or package contracts, migration needs, and recovery limits.",
      "Update the authoritative dependency declaration and required derived or lock surfaces together. Preserve unrelated dependency and configuration choices.",
      "Verify the affected consumers, supported runtimes, and package behavior with relevant checks. Describe unsupported environments, unresolved compatibility, and remaining removal or rollout work explicitly.",
    ],
  },
  "test-hardening": {
    description: "Improve evidence for existing behavior or a demonstrated regression through independent expectations, meaningful failure fixtures, and proportionate execution cost.",
    sources: ["docs/engineering/05-testing-standard.md", "docs/engineering/00-project-invariants.md"],
    workflow: [
      "Identify the contract, invariant, or user-visible risk whose current evidence is weak. Determine what observation would disprove correctness rather than starting from an arbitrary coverage target.",
      "Define the expected result independently of the implementation. Include relevant rejection, interruption, partial-effect, or recovery states rather than checking only a successful call.",
      "Control ordering or failures where needed and report unsupported conditions as explicit gaps. Avoid timing repetition, swallowed fixture errors, and assertions that would pass after removing the protected behavior.",
      "Run the narrow checks that establish the risk. Remove redundant or obsolete checks only after confirming that their required evidence remains covered.",
    ],
  },
};

export function renderTaskSkill(name: string): string | undefined {
  if (!Object.hasOwn(taskSkills, name)) return undefined;
  const skill = taskSkills[name];
  if (skill === undefined) return undefined;
  return renderSkillDefinition(name, skill);
}
