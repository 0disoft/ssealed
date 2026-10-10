import type { Addon, Density, Profile, Scope } from "../core/types.js";
import { documentMetadata } from "./document-format.js";
import { renderCommonChecklist } from "./common-checklists.js";
import { renderCommonValidation } from "./common-validations.js";
import { renderProfileChecklist } from "./profile-checklists.js";
import { renderProfileSkill } from "./profile-skills.js";
import { renderScopeChecklist } from "./scope-checklists.js";
import { renderScopeSkill } from "./scope-skills.js";
import { renderScopeValidation } from "./scope-validations.js";
import { renderTaskSkill } from "./task-skills.js";

export function markdownDoc(title: string): string {
  return `# ${title}

${documentMetadata([
  ["Status", "Draft"],
  ["Owner", "UNASSIGNED"],
])}

## Purpose

This document captures the durable design contract for ${title}.
It is intentionally a scaffold and should be filled with project-specific decisions as they become known.

## Source of Truth

- Product decision: UNDECIDED
- Technical owner: UNASSIGNED
- Related ADR: UNDECIDED

## Required Decisions

- Boundary: UNDECIDED
- Data ownership: UNDECIDED
- Failure and recovery behavior: UNDECIDED
- Validation needed before merge: VALIDATION.md

## Review Blockers

- The change invents a product domain without a source.
- The change weakens validation or skips required evidence.
- The change relies on generated, cache, or build output as source truth.
`;
}

export function rootAgents(scope: Scope, profile: Profile, addons: readonly Addon[] = [], density: Density = "standard"): string {
  const backendFacingContracts =
    density === "minimal"
      ? "`api/openapi.yaml`, `docs/backend/README.md`, and `docs/backend/00-api-server-boundary.md`"
      : "`api/openapi.yaml`, `api/examples/*.json`, `docs/backend/04-http-api-policy.md`, and `docs/backend/05-error-response.md`";
  const architectureSource = density === "minimal" ? "Architecture boundary: docs/architecture/00-system-boundary.md" : "Architecture decisions: docs/adr/*.md";
  const fullstackDbSource =
    density === "minimal"
      ? "DB structure is not generated at minimal density; record project-owned persistence decisions before treating DB files as source."
      : "DB structure is sourced from `db/schema.dbml`.";
  const scopeText = {
    backend: `Scope: backend

This repository owns API server behavior, server-side domain rules, authentication,
authorization, persistence, migrations, observability, and backend security.

This repository does not own frontend routing, visual design, component hierarchy,
design tokens, or browser interaction policy.

Frontend-facing behavior is contracted through ${backendFacingContracts}.`,
    frontend: `Scope: frontend

This repository owns routing, page model, state ownership, component boundaries,
design token usage, accessibility, frontend performance, and frontend observability.

This repository does not own backend internals, database schema, migration strategy,
or server-side authorization implementation.

Backend-facing behavior is consumed through \`contracts/backend-api/openapi.yaml\`
and \`docs/integrations/backend-api.md\`.`,
    fullstack: `Scope: fullstack

This repository owns backend, frontend, API contracts, DB contracts, product specs,
engineering standards, and operational standards.

API request and response shapes are sourced from \`api/openapi.yaml\`.

${fullstackDbSource}`,
    general: `Scope: general

This repository owns product, architecture, ADR, engineering, and operational design scaffolds.

This scaffold does not generate implementation source code; any existing source remains project-owned.`,
    mobile: `Scope: mobile

This repository owns mobile product surface behavior, platform support decisions, app lifecycle,
offline and sync contracts, store release notes, and mobile-specific validation surfaces.

This repository does not own backend internals, server-side authorization implementation,
database schema, or runtime infrastructure.`,
    infra: `Scope: infra

This repository owns infrastructure design contracts, environment boundaries, change plans,
drift handling, rollback decisions, and operational validation surfaces.

This repository does not generate runtime infrastructure code, credentials, cloud resources,
or deployment secrets.`,
    data: `Scope: data

This repository owns data pipeline contracts, lineage, quality gates, retention decisions,
privacy boundaries, and data validation surfaces.

This repository does not generate production datasets, credentials, warehouse objects,
or application runtime code.`,
  } satisfies Record<Scope, string>;

  return `# AGENTS.md

## Repository Scope

${scopeText[scope]}

${repositoryShapeBlock(profile, addons)}

## Source of Truth

- Product scope: docs/product/02-spec.md
- ${architectureSource}
- Validation: VALIDATION.md
- Agent routing: .agents/context-map.md
- Repository hygiene: .editorconfig, .gitattributes, .gitignore

## Hard Rules

- Do not generate or infer application source code from this scaffold.
- Do not invent technology choices. Use UNDECIDED when a decision is not known.
- Do not create fake credentials, tokens, secrets, or private values.
- Do not rely on generated, cache, or build output as source truth.

## Repository Hygiene

- .editorconfig sets line ending, encoding, and final newline policy.
- .gitattributes sets Git text normalization and binary diff policy.
- .gitignore excludes local, secret, build, and cache artifacts.
- Generated, cache, and build output must not be used as design-document evidence.
- Do not create large diffs that only change line endings.

## Before Editing

- Read this file, VALIDATION.md, CHECKLIST.md, and .agents/context-map.md.
- Read the skill and checklist named by the context map.
- Confirm source-of-truth documents before changing contracts.

## Out of Scope

- Application source scaffolding.
- Runtime infrastructure such as Docker, Kubernetes, Terraform, or framework apps.
- Project-specific credentials or deployment secrets.

## Final Response Requirements

- List executed validations, passed validations, skipped validations, skip reasons, and remaining risk.
- Name any source-of-truth documents changed.
- Call out API, DB, repository hygiene, and runner changes explicitly.
`;
}

export function rootReadme(scope: Scope, profile: Profile, addons: readonly Addon[] = []): string {
  return `# Repository Design Scaffold

${documentMetadata([
  ["Status", "Draft"],
  ["Scope", scope],
  ["Repository Type", profile],
  ["Addons", formatAddons(addons)],
])}

This repository contains an LLM-friendly design scaffold. It is not application source code.

## Source Files

- AGENTS.md: agent working rules
- CHECKLIST.md: checklist router
- VALIDATION.md: validation names and reporting requirements
- .agents/context-map.md: agent route map
- docs/: design, operations, architecture, and engineering standards

${repositoryShapeNotes(profile, addons)}

## Repository Hygiene

.editorconfig, .gitattributes, and .gitignore are generated to keep line endings,
binary diffs, local files, build outputs, caches, and secret files under control.

## Scope Notes

Project-specific implementation choices remain UNDECIDED until the repository owner records them.
`;
}

export function docsReadme(scope: Scope, profile: Profile, addons: readonly Addon[] = [], density: Density = "standard"): string {
  const architectureSource =
    density === "minimal" ? "- Architecture boundary source: docs/architecture/00-system-boundary.md" : "- Architecture decisions source: docs/adr/*.md";
  const sourceLines = [
    "- Product scope source: docs/product/02-spec.md",
    ...(scope === "backend" || scope === "fullstack" ? ["- API source for backend/fullstack: api/openapi.yaml"] : []),
    ...(scope === "frontend" ? ["- API consumed contract for frontend: contracts/backend-api/openapi.yaml"] : []),
    ...(density !== "minimal" && (scope === "backend" || scope === "fullstack") ? ["- DB source for backend/fullstack: db/schema.dbml"] : []),
    architectureSource,
    ...(scope === "frontend" || scope === "fullstack"
      ? ["- Frontend design source: docs/frontend/FRONTEND_DESIGN.md when generated"]
      : []),
    ...(scope === "mobile" ? ["- Mobile source: docs/mobile/app-contract.md"] : []),
    ...(scope === "infra" ? ["- Infrastructure source: docs/infra/module-contract.md"] : []),
    ...(scope === "data" ? ["- Data pipeline source: docs/data/pipeline-contract.md"] : []),
    "- Operational standard source: docs/ops/00-operational-contract.md",
    "- Validation source: VALIDATION.md",
    "- Agent routing source: .agents/context-map.md",
    "- Repository hygiene source: .editorconfig, .gitattributes, .gitignore",
    ...profileList(profile, addons).flatMap((value) => profileSourceLines(value, scope, density)),
  ];

  return `# Documentation

${documentMetadata([["Status", "Draft"]])}

## Source of Truth

${sourceLines.join("\n")}
`;
}

export function contextMap(scope: Scope, profile: Profile, addons: readonly Addon[] = [], density: Density = "standard"): string {
  const isMinimal = density === "minimal";
  const routes = [
    ...(scope === "backend" || scope === "fullstack"
      ? ["- Backend API route: .agents/skills/backend-api/SKILL.md", ...(isMinimal ? [] : ["- DB migration route: .agents/skills/db-migration/SKILL.md"])]
      : []),
    ...(scope === "frontend" || scope === "fullstack"
      ? ["- Frontend UI route: .agents/skills/frontend-ui/SKILL.md", "- Backend API contract consumption: docs/integrations/backend-api.md"]
      : []),
    ...(scope === "general"
      ? [
          "- Product scope route: docs/product/02-spec.md",
          isMinimal ? "- Architecture route: docs/architecture/00-system-boundary.md" : "- Architecture route: docs/architecture/ and docs/adr/",
          "- Documentation update route: docs/README.md",
        ]
      : []),
    ...(scope === "mobile" ? ["- Mobile app route: .agents/skills/mobile-app/SKILL.md"] : []),
    ...(scope === "infra" ? ["- Infrastructure route: .agents/skills/infra-change/SKILL.md"] : []),
    ...(scope === "data" ? ["- Data pipeline route: .agents/skills/data-pipeline/SKILL.md"] : []),
    ...profileList(profile, addons).flatMap((value) => profileRoutes(value)),
    "- Feature route: .agents/skills/feature/SKILL.md",
    "- Bugfix route: .agents/skills/bugfix/SKILL.md",
    "- Security checklist route: .agents/checklists/security.md",
    "- Ops checklist route: .agents/checklists/ops-change.md",
    ...(isMinimal
      ? []
      : [
          "- Ops route: .agents/skills/ops-change/SKILL.md",
          "- Dependency route: .agents/skills/dependency-upgrade/SKILL.md",
          "- Dependency checklist route: .agents/checklists/dependency.md",
          "- Refactor route: .agents/skills/refactor/SKILL.md",
          "- Test hardening route: .agents/skills/test-hardening/SKILL.md",
        ]),
  ];

  return `# Agent Context Map

${documentMetadata([
  ["Status", "Draft"],
  ["Scope", scope],
  ["Repository Type", profile],
  ["Addons", formatAddons(addons)],
])}

## Routes

${routes.join("\n")}
`;
}

export function validationDoc(title: string, scope: Scope, profile: Profile, addons: readonly Addon[] = [], filePath = "VALIDATION.md"): string {
  const taskValidation = renderScopeValidation(filePath, title, scope) ?? renderCommonValidation(filePath, title);
  if (taskValidation !== undefined) return taskValidation;
  const repositoryShape = profileList(profile, addons);
  const repositoryShapeBlock =
    repositoryShape.length === 0
      ? ""
      : `
## Repository Shape

${repositoryShape.join(", ")} validation must stay repository-shape focused and must not imply generated application source code.
`;

  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Validation Source of Truth

This document owns stable validation names for this scaffold.

## Standard Validation Names

- format
- lint
- typecheck
- test
- contract
- migration-check
- smoke
- docs
- check

## Required Final Report

Final responses must list executed validations, passed validations, skipped validations, skip reasons, and remaining risk.

## Runner Policy

Task runner files are optional. Runner \`none\` means no executable task runner is generated.
If a runner is generated, runner command names must match this document.
Unconfigured runner commands must fail, not pass with a fake success.

## Hygiene Validation

Repository hygiene file changes must check line-ending churn, binary diff pollution,
tracked secret files, ignored build/cache artifacts, and generated-output drift.

## Scope

${scope} validation routes must stay stack-neutral unless a runner file explicitly defines a command.
${repositoryShapeBlock}`;
}

export function profileDoc(title: string, profile: Profile): string {
  return `# ${title}

${documentMetadata([
  ["Status", "Draft"],
  ["Repository Type", profile],
])}

## Repository Type Contract

${profileContract(profile)}

## Source of Truth

- Product decision: UNDECIDED
- Technical owner: UNASSIGNED
- Related ADR: UNDECIDED

## Required Decisions

${profileRequiredDecisions(profile).map((decision) => `- ${decision}`).join("\n")}

## Review Blockers

${profileReviewBlockers(profile).map((blocker) => `- ${blocker}`).join("\n")}
`;
}

function repositoryShapeBlock(profile: Profile, addons: readonly Addon[]): string {
  const selected = profileList(profile, addons);
  if (selected.length === 0) {
    return "";
  }
  return `## Repository Shape

${documentMetadata([
  ["Primary repository type", profile],
  ["Addons", formatAddons(addons)],
])}

${selected.map((value) => `- ${value}: ${profileContract(value)}`).join("\n")}
`;
}

function repositoryShapeNotes(profile: Profile, addons: readonly Addon[]): string {
  const selected = profileList(profile, addons);
  if (selected.length === 0) {
    return "";
  }
  return `## Repository Shape Notes

${selected.map((value) => `- ${value}: ${profileContract(value)}`).join("\n")}
`;
}

function profileList(profile: Profile, addons: readonly Addon[]): readonly Addon[] {
  return [profile, ...addons].filter((value): value is Addon => value !== "generic");
}

function formatAddons(addons: readonly Addon[]): string {
  return addons.length === 0 ? "none" : addons.join(", ");
}

interface ProfileMetadata {
  readonly contract: string;
  readonly sources: readonly string[];
  readonly route: string;
  readonly decisions: readonly string[];
  readonly blockers: readonly string[];
}

const profileMetadata = {
  "cli-tool": {
    contract: "This repository type owns command behavior, arguments, flags, config loading, exit codes, terminal output, JSON output, runtime compatibility, and shell integration contracts.",
    sources: ["- CLI command contract source: docs/cli/command-contract.md", "- CLI output and exit-code source: docs/cli/output-and-exit-codes.md", "- CLI config source: docs/cli/configuration.md"],
    route: "- CLI tool route: .agents/skills/cli-tool/SKILL.md",
    decisions: [
      "Command list and flag ownership: UNDECIDED",
      "Exit-code taxonomy: UNDECIDED",
      "Machine-readable output contract: UNDECIDED",
      "Config precedence and default behavior: UNDECIDED",
      "Runtime compatibility floor: UNDECIDED",
    ],
    blockers: [
      "A command changes without updating help, examples, output, and exit-code expectations.",
      "JSON output exposes generated or existing file contents.",
      "Runtime compatibility changes without smoke validation.",
    ],
  },
  "api-service": {
    contract: "This repository type owns service API lifecycle, request and response contracts, idempotency, rate limits, service SLOs, operational readiness, and client-facing error behavior.",
    sources: ["- API lifecycle source: docs/api-service/api-lifecycle.md", "- API idempotency source: docs/api-service/idempotency.md", "- API rate-limit source: docs/api-service/rate-limits.md", "- API service SLO source: docs/api-service/slo.md"],
    route: "- API service route: .agents/skills/api-service/SKILL.md",
    decisions: [
      "OpenAPI ownership and publish path: UNDECIDED",
      "Authentication and authorization surface: UNDECIDED",
      "Idempotency and retry behavior: UNDECIDED",
      "Rate-limit and quota policy: UNDECIDED",
      "SLO, health, and operational readiness: UNDECIDED",
    ],
    blockers: [
      "Request or response behavior changes without source contract updates.",
      "Retry-prone writes lack idempotency behavior.",
      "Operational readiness is implied without health, SLO, rollback, or observability evidence.",
    ],
  },
  "desktop-app": {
    contract: "This repository type owns installed app behavior, OS support, local data, installer, auto-update, crash reporting, permissions, and desktop-specific security contracts.",
    sources: ["- Desktop installer source: docs/desktop/installers.md", "- Desktop auto-update source: docs/desktop/auto-update.md", "- Desktop local data source: docs/desktop/local-data.md", "- Desktop OS support source: docs/desktop/os-support.md"],
    route: "- Desktop app route: .agents/skills/desktop-app/SKILL.md",
    decisions: [
      "Supported operating systems and architectures: UNDECIDED",
      "Installer and update channel ownership: UNDECIDED",
      "Local data and cache ownership: UNDECIDED",
      "Crash report and diagnostic data policy: UNDECIDED",
      "Desktop permission and security boundaries: UNDECIDED",
    ],
    blockers: [
      "Installer, update, or OS support behavior changes without platform-specific validation.",
      "Local data behavior changes without migration, privacy, and recovery notes.",
      "Crash diagnostics or logs can expose private data.",
    ],
  },
  library: {
    contract: "This repository type owns public API surface, package compatibility, semantic versioning, migration guidance, distribution artifacts, and consumer-facing deprecation policy.",
    sources: ["- Library public API source: docs/library/public-api.md", "- Library semver source: docs/library/semver.md", "- Library compatibility source: docs/library/compatibility.md", "- Library migration source: docs/library/migration-guide.md"],
    route: "- Library package route: .agents/skills/library-package/SKILL.md",
    decisions: [
      "Public API ownership: UNDECIDED",
      "Semantic versioning policy: UNDECIDED",
      "Runtime and platform compatibility: UNDECIDED",
      "Package artifact and export surface: UNDECIDED",
      "Deprecation and migration policy: UNDECIDED",
    ],
    blockers: [
      "Public exports change without semver and migration notes.",
      "Compatibility claims lack runtime or consumer evidence.",
      "Package artifacts drift from documented public API.",
    ],
  },
  "web-app": profileMetadataEntry("Web app", "docs/web-app", "web-app", ["routes, rendering mode, browser state, accessibility, and client observability"], ["Route or rendering behavior changes without documented user-visible states.", "Browser state ownership is unclear or duplicates server state."]),
  "mobile-app": profileMetadataEntry("Mobile app", "docs/mobile-app", "mobile-app", ["platform support, app lifecycle, offline behavior, store release, and mobile diagnostics"], ["Platform-specific behavior changes without OS and device validation.", "Offline or sync behavior lacks conflict and recovery notes."]),
  sdk: profileMetadataEntry("SDK", "docs/sdk", "sdk", ["public API, compatibility, examples, versioning, and consumer migration"], ["SDK examples drift from public API.", "Compatibility claims lack runtime or consumer evidence."]),
  "worker-service": profileMetadataEntry("Worker service", "docs/worker-service", "worker-service", ["job contracts, queue ownership, retry policy, idempotency, and worker observability"], ["Retry behavior lacks idempotency and poison-message handling.", "Queue changes lack visibility, backpressure, or recovery evidence."]),
  "infra-module": profileMetadataEntry("Infrastructure module", "docs/infra-module", "infra-module", ["module interface, environment contract, drift policy, rollout, and rollback"], ["Infrastructure drift is accepted without owner and rollback notes.", "Environment changes lack blast-radius and validation evidence."]),
  "data-pipeline": profileMetadataEntry("Data pipeline", "docs/data-pipeline", "data-pipeline", ["lineage, freshness, quality gates, privacy, retention, and downstream contracts"], ["Pipeline changes lack lineage or freshness evidence.", "Data quality claims lack measured gates and failure handling."]),
  "github-action": profileMetadataEntry("GitHub Action", "docs/github-action", "github-action", ["action inputs, outputs, permissions, token handling, and runner compatibility"], ["Action permission changes lack least-privilege review.", "Outputs or exit behavior changes without workflow examples."]),
  "browser-extension": profileMetadataEntry("Browser extension", "docs/browser-extension", "browser-extension", ["extension permissions, content-script boundaries, browser compatibility, and privacy"], ["Permission expansion lacks user-visible justification.", "Content script behavior crosses host-page boundaries without review."]),
  plugin: profileMetadataEntry("Plugin", "docs/plugin", "plugin", ["host contract, extension points, compatibility, lifecycle, and sandbox boundaries"], ["Host compatibility changes lack version and fallback notes.", "Plugin extension points expose unstable internals."]),
  "docs-site": profileMetadataEntry("Docs site", "docs/docs-site", "docs-site", ["information architecture, publishing, search, content quality, and redirects"], ["Content structure changes break navigation or redirects.", "Publishing behavior changes without preview or link validation."]),
  monorepo: profileMetadataEntry("Monorepo", "docs/monorepo", "monorepo", ["workspace boundaries, package ownership, dependency policy, and change coordination"], ["Cross-package changes lack ownership and dependency impact review.", "Workspace scripts or package boundaries drift from documented contracts."]),
} satisfies Record<Addon, ProfileMetadata>;

function profileMetadataEntry(label: string, sourceDir: string, skillSlug: string, owns: readonly string[], blockers: readonly string[]): ProfileMetadata {
  return {
    contract: `This repository type owns ${owns.join(", ")}.`,
    sources: [`- ${label} source: ${sourceDir}/README.md`],
    route: `- ${label} route: .agents/skills/${skillSlug}/SKILL.md`,
    decisions: [
      `${label} ownership boundary: UNDECIDED`,
      `${label} public contract: UNDECIDED`,
      `${label} validation evidence: UNDECIDED`,
      `${label} release or rollout policy: UNDECIDED`,
      `${label} compatibility and migration policy: UNDECIDED`,
    ],
    blockers,
  };
}

function profileContract(profile: Profile): string {
  if (profile === "generic") {
    return "The generic repository type adds no repository-shape-specific documents beyond the selected scope.";
  }
  return profileMetadata[profile].contract;
}

function profileSourceLines(profile: Addon, scope: Scope, density: Density): readonly string[] {
  const apiSource = profile === "api-service" && scope !== "backend" && scope !== "fullstack" ? ["- API source for api-service repository type: api/openapi.yaml"] : [];
  if (profile === "cli-tool") {
    return [
      "- CLI command contract source: docs/cli/command-contract.md",
      ...(density === "minimal" ? [] : ["- CLI config source: docs/cli/configuration.md", "- CLI output and exit-code source: docs/cli/output-and-exit-codes.md"]),
    ];
  }
  if (profile === "api-service") {
    return [
      ...apiSource,
      "- API lifecycle source: docs/api-service/api-lifecycle.md",
      ...(density === "minimal" ? [] : ["- API idempotency source: docs/api-service/idempotency.md"]),
      ...(density === "strict" ? ["- API rate-limit source: docs/api-service/rate-limits.md", "- API service SLO source: docs/api-service/slo.md"] : []),
    ];
  }
  if (profile === "desktop-app") {
    return [
      "- Desktop installer source: docs/desktop/installers.md",
      ...(density === "minimal" ? [] : ["- Desktop auto-update source: docs/desktop/auto-update.md", "- Desktop local data source: docs/desktop/local-data.md"]),
      ...(density === "strict" ? ["- Desktop OS support source: docs/desktop/os-support.md"] : []),
    ];
  }
  if (profile === "library") {
    return [
      "- Library public API source: docs/library/public-api.md",
      ...(density === "minimal" ? [] : ["- Library semver source: docs/library/semver.md", "- Library compatibility source: docs/library/compatibility.md"]),
      ...(density === "strict" ? ["- Library migration source: docs/library/migration-guide.md"] : []),
    ];
  }
  return [...apiSource, ...profileMetadata[profile].sources];
}

function profileRoutes(profile: Addon): readonly string[] {
  return [profileMetadata[profile].route];
}

function profileRequiredDecisions(profile: Profile): readonly string[] {
  if (profile === "generic") {
    return ["Repository-shape-specific decisions: UNDECIDED"];
  }
  return profileMetadata[profile].decisions;
}

function profileReviewBlockers(profile: Profile): readonly string[] {
  if (profile === "generic") {
    return ["A repository-type-specific claim is made without a matching repository-type document."];
  }
  return profileMetadata[profile].blockers;
}

export function checklistDoc(title: string, filePath: string, scope: Scope = "general"): string {
  const checklist = renderScopeChecklist(filePath, title, scope) ?? renderCommonChecklist(filePath, title) ?? renderProfileChecklist(filePath, title);
  if (checklist === undefined) throw new Error(`Missing required checklist: ${filePath}`);
  return checklist;
}

export function agentSkill(name: string, scope: Scope = "general"): string {
  const skill = renderTaskSkill(name) ?? renderScopeSkill(name, scope) ?? renderProfileSkill(name);
  if (skill === undefined) throw new Error(`Missing required agent skill: .agents/skills/${name}/SKILL.md`);
  return skill;
}

export function githubIssueTemplate(title: string): string {
  return `---
name: ${title}
about: Track a ${title.toLowerCase()} without inventing product facts.
---

## Context

## Source of truth

## Expected behavior

## Risk

## Validation
`;
}

export { documentMetadata } from "./document-format.js";
export { frontendDesignDoc, renderFrontendTopic } from "./frontend-document.js";
export { dbml, openApiSkeleton } from "./api-contracts.js";
