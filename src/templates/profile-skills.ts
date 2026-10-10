import { renderSkillDefinition, type SkillDefinition } from "./agent-skill-format.js";

const profileSkills: Readonly<Record<string, SkillDefinition>> = {
  "cli-tool": {
    description: "Change CLI commands, configuration, machine-readable output, or exit behavior while preserving argument contracts and accurate reporting of effects and recovery.",
    sources: ["docs/cli/README.md", "docs/cli/command-contract.md", ".agents/checklists/cli-tool.md"],
    workflow: [
      "Identify the command's purpose, argument grammar, target resolution, side effects, and effective configuration. Distinguish omitted, empty, and invalid inputs, and follow existing interactive and non-interactive behavior.",
      "Keep terminal output, machine-readable framing, and exit status consistent with actual effects. Define the completion boundary across writes, recovery, and cleanup before reporting success or cancellation.",
      "Preserve original and recovery failures and existing user files. Account for interrupted work, repeatability, and dry-run behavior without letting diagnostics, progress, or prompts corrupt machine-readable results.",
      "Verify the actual executable or installed entrypoint with relevant arguments, output parsing, and failure or interruption scenarios. Keep unsupported shells, platforms, and configuration paths explicit.",
    ],
  },
  "api-service": {
    description: "Change an API service's operation lifecycle, compatibility, capacity, or rollout behavior using the owned contract, consumer evidence, and observable completion.",
    sources: ["docs/api-service/README.md", "docs/api-service/api-lifecycle.md", "api/openapi.yaml", ".agents/checklists/api-service.md"],
    workflow: [
      "Identify the owned service operations, authoritative API contract, consumers, and lifecycle state. Distinguish request behavior from contract publication, service activation, and consumer migration.",
      "Keep caller and tenant authority, operation preconditions, and compatible results aligned across service versions. Define concurrent or duplicate request behavior and reconciliation for partial or unknown effects.",
      "For capacity, limits, or reliability changes, connect rejection and retry behavior to the affected journeys and observed service state. Preserve bounded recovery and avoid treating an accepted request or healthy process as completed work.",
      "Verify relevant consumer operations, rejection paths, and version overlap using the actual service and contract evidence available. Report remaining rollout, deprecation, and operating gaps before describing the transition as complete.",
    ],
  },
  "library-package": {
    description: "Change a library's public APIs, types, lifecycle, or distributed package while preserving its declared compatibility promise and real consumer usage.",
    sources: ["docs/library/README.md", "docs/library/public-api.md", ".agents/checklists/library-package.md"],
    workflow: [
      "Identify supported public entrypoints, types, defaults, error behavior, and consumer environments. Separate the public compatibility promise from internal implementation details and scaffold assumptions.",
      "Preserve agreed ownership, resource lifetime, call ordering, and side-effect behavior across changes. Account for concurrent or asynchronous usage and the state remaining after failure or disposal.",
      "Classify observable compatibility changes under the project's version and dependency policies. Align exported artifacts, declarations, examples, and any required migration guidance with the authoritative public contract.",
      "Verify representative consumers against the packaged artifact, including affected imports, types, and lifecycle behavior. Repository-internal calls alone do not prove the distributed package is usable in supported environments.",
    ],
  },
  sdk: {
    description: "Change SDK initialization, public operations, host or service integration, or compatibility with explicit caller responsibilities and installed-consumer evidence.",
    sources: ["docs/sdk/README.md", "docs/sdk/public-api.md", ".agents/checklists/sdk.md"],
    workflow: [
      "Identify the SDK's public contract, supported consumers, configuration, and the underlying host, service, or library authority. Keep client promises distinct from upstream capabilities and versions.",
      "Trace public operations to actual underlying effects and error mapping. Assign retry, timeout, cancellation, iteration, and resource cleanup ownership where applicable so wrapper layers do not duplicate work or hide incomplete effects.",
      "Preserve credential scope and diagnostic redaction where credentials are used. Keep caller context and evolving upstream fields or capabilities consistent with the project's compatibility policy rather than silently dropping or inventing information.",
      "Verify representative installed-consumer setup, operations, and relevant failure or cancellation behavior against supported upstream contracts. Keep untested environment combinations, migration needs, and release work explicit.",
    ],
  },
  "worker-service": {
    description: "Change background job delivery, execution, acknowledgment, or recovery with explicit job identity, concurrent ownership, and safe replay boundaries.",
    sources: ["docs/worker-service/README.md", "docs/worker-service/job-contract.md", ".agents/checklists/worker-service.md"],
    workflow: [
      "Identify producers, job identity and schema, tenant context, execution authority, and downstream consumers. Distinguish accepted, running, completed, and failed work and their observable effects.",
      "Define delivery, ordering, acknowledgment, and concurrent worker ownership according to the actual queue and effect boundaries. Account for lease loss, stale workers, and the gap between persisted completion and external effects.",
      "Classify retryable, permanent, and unknown outcomes and apply the project's retry budget. Preserve cancellation and deadline state, and reconcile partially completed effects before replaying or backfilling jobs.",
      "Verify relevant duplicate delivery, interrupted execution, stale-owner, and restart paths with controlled evidence. Include old queued schemas and final exhausted or quarantined states when the change affects them.",
    ],
  },
};

export function renderProfileSkill(name: string): string | undefined {
  if (!Object.hasOwn(profileSkills, name)) return undefined;
  const skill = profileSkills[name];
  return skill === undefined ? undefined : renderSkillDefinition(name, skill);
}
