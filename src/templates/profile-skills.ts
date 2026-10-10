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
  "desktop-app": {
    description: "Change desktop installation, updates, local state, or application lifecycle using supported platform contracts and evidence of the actual installed behavior.",
    sources: ["docs/desktop/README.md", "docs/desktop/installers.md", ".agents/checklists/desktop-app.md"],
    workflow: [
      "Identify supported platforms, distribution artifacts, publisher authority, installation privileges, and owned paths. Preserve user data and shared components across installation, repair, or removal according to the existing contract.",
      "Distinguish trusted artifact delivery, installed state, and application activation. Account for interrupted updates and local-data compatibility before claiming that restoring an older binary can recover the previous state.",
      "Assign application resources and pending work to lifecycle owners. Keep late completions from mutating closed or replaced views, preserve recoverable user work, and follow existing diagnostic privacy and cleanup rules.",
      "Verify relevant journeys using the installed application and supported platform evidence, including affected upgrade, interruption, or recovery paths. Keep untested platforms, incomplete cleanup, and remaining distribution work explicit.",
    ],
  },
  "web-app": {
    description: "Change web application navigation, rendering, or browser-state behavior with explicit URL ownership, user-state recovery, and supported browser evidence.",
    sources: ["docs/web-app/README.md", "docs/web-app/routing-and-rendering.md", ".agents/checklists/web-app.md"],
    workflow: [
      "Identify supported user journeys, URL and route owners, rendering boundaries, and data-loading responsibilities. Follow the project's server, client, or static rendering choices and coordinate separately owned service contracts.",
      "Keep direct loads and client navigation consistent with caller identity and current intent. Limit data crossing rendering or URL boundaries, and prevent delayed navigation or hydration results from replacing newer state or user edits.",
      "Define restoration of form input, focus, scroll, and browser history where affected. Account for identity switches, multiple tabs, stale persistence, and failed loads without silently discarding recoverable work.",
      "Verify relevant direct-load, navigation, rejection, and recovery paths in supported browsers. Distinguish rendered and accessibility evidence from build success or markup checks and record remaining environment gaps.",
    ],
  },
  "browser-extension": {
    description: "Change browser extension execution, page integration, permissions, or lifecycle with explicit context authority and evidence across supported browser surfaces.",
    sources: ["docs/browser-extension/README.md", "docs/browser-extension/extension-contract.md", ".agents/checklists/browser-extension.md"],
    workflow: [
      "Identify supported browsers and the responsibilities of extension UI, background execution, content scripts, and external integrations. Follow the declared lifecycle instead of assuming background execution or in-memory state is permanent.",
      "Bind page or message effects to the responsible caller, origin, frame, and current capability grants. Treat page content as untrusted input and handle denied or revoked access without broadening permissions to bypass a failed operation.",
      "Assign persistent state, pending effects, listeners, and registrations to owners with restart and cleanup behavior. Preserve user work across suspension, state migration, or update, and reconcile uncertain effects before replaying them.",
      "Verify affected lifecycle and page interactions in the actual supported browser contexts, including relevant denied grants, unrelated origins, and interrupted operations. Report remaining distribution and browser compatibility gaps.",
    ],
  },
  plugin: {
    description: "Change plugin activation, extension points, host integration, or teardown with explicit capability, callback lifetime, and resource ownership contracts.",
    sources: ["docs/plugin/README.md", "docs/plugin/host-contract.md", ".agents/checklists/plugin.md"],
    workflow: [
      "Identify supported host interfaces, granted capabilities, extension points, and state owners. Use the documented host contract rather than treating incidental internals or scaffold assumptions as supported authority.",
      "Assign registrations, listeners, tasks, handles, and persisted state to activation owners. Define repeated activation, overlapping invocation, and failure behavior so one instance does not duplicate effects or release another instance's resources.",
      "Account for disable or unload with pending callbacks and asynchronous completions. Keep invalidated work from mutating host state, release owned resources, and distinguish cancellation requests from completed teardown.",
      "Verify relevant activation, capability denial, failure, and teardown behavior against supported hosts. Include state or host-version migration when affected and preserve user configuration through update or recovery.",
    ],
  },
};

export function renderProfileSkill(name: string): string | undefined {
  if (!Object.hasOwn(profileSkills, name)) return undefined;
  const skill = profileSkills[name];
  return skill === undefined ? undefined : renderSkillDefinition(name, skill);
}
