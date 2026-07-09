import type { Addon, Density, Profile, Scope } from "../core/types.js";

export function documentMetadata(entries: ReadonlyArray<readonly [string, string]>): string {
  return entries.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}

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

export function architectureDoc(title: string): string {
  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Boundary

Define what this repository owns, what it consumes, and which contracts cannot drift.

## Runtime Flow

UNDECIDED. Add the minimal sequence needed to explain request, state, failure, and recovery behavior.

## Quality Attributes

- Maintainability: changes must preserve source-of-truth documents.
- Security: authentication, authorization, tenant boundaries, and secrets need explicit owners.
- Operability: logs, metrics, rollback, and incident response must be considered before release.
`;
}

export function backendDoc(title: string): string {
  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Backend Contract

This backend document covers API server boundary, authentication, authorization, persistence model,
HTTP API policy, error response, logging and observability, migration strategy,
and backend security as applicable.

## Required Decisions

- API owner: UNASSIGNED
- Auth model: UNDECIDED
- Authorization checks: UNDECIDED
- Persistence model: UNDECIDED
- Error response policy: docs/backend/05-error-response.md

## Merge Blockers

- OpenAPI drift from api/openapi.yaml.
- Authorization behavior hidden in one handler or UI.
- Migration plan missing rollback or forward-fix path.
`;
}

export function engineeringDoc(title: string): string {
  const lower = title.toLowerCase();
  const body = engineeringBody(lower);

  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Contract

${body}

## Required Evidence

- Source of truth: UNDECIDED
- Owner: UNASSIGNED
- Merge-blocking validation: VALIDATION.md
- Related checklist: CHECKLIST.md

## Review Blockers

- A change bypasses the source of truth.
- A change weakens validation or hides skipped checks.
- A change lacks failure, recovery, security, performance, or test evidence where relevant.
`;
}

function engineeringBody(lowerTitle: string): string {
  if (lowerTitle.includes("invariants")) {
    return "Project invariants define what must remain true across implementation, tests, docs, configuration, and release behavior.";
  }
  if (lowerTitle.includes("design review")) {
    return [
      "Design review questions must cover problem boundary, ownership, data/state,",
      "failure and recovery, future cost, and source-of-truth drift.",
    ].join(" ");
  }
  if (lowerTitle.includes("code review")) {
    return [
      "Code review blockers include ownership drift, hidden auth or tenant rules, untested failure paths,",
      "contract drift, fake validation success, and generated-output dependency.",
    ].join(" ");
  }
  if (lowerTitle.includes("performance")) {
    return [
      "Performance budgets must track latency, payload size, query count, cache behavior,",
      "bundle size, background jobs, and UNDECIDED project-specific thresholds.",
    ].join(" ");
  }
  if (lowerTitle.includes("security")) {
    return [
      "Security baseline covers authentication, authorization, tenant boundaries, input validation,",
      "output validation, secrets, external integrations, logs, and security blockers.",
    ].join(" ");
  }
  if (lowerTitle.includes("testing")) {
    return "Testing standard defines merge-blocking expectations for unit, integration, contract, migration, smoke, docs, and regression evidence.";
  }
  if (lowerTitle.includes("dependency")) {
    return [
      "Dependency policy covers necessity, alternatives, license, maintenance health, vulnerabilities,",
      "runtime impact, bundle impact, major upgrade policy, and removal cost.",
    ].join(" ");
  }
  return [
    "Operability standard connects code changes to logs, metrics, traces, rollback, runbooks,",
    "health checks, incident response, and failure evidence.",
  ].join(" ");
}

export function opsDoc(title: string): string {
  const lower = title.toLowerCase();
  const body = opsBody(lower);

  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Operational Contract

${body}

## Owners

- Primary owner: UNASSIGNED
- Backup owner: UNASSIGNED
- Escalation path: UNDECIDED

## Validation

- Required validation names: VALIDATION.md
- Release blocker status: UNDECIDED
- Remaining operational risk: UNDECIDED
`;
}

function opsBody(lowerTitle: string): string {
  if (lowerTitle.includes("operational contract")) {
    return "Define critical user journeys, operational priorities, SLO, RTO, RPO, release blocking conditions, ownership, and dependency tiers.";
  }
  if (lowerTitle.includes("observability")) {
    return "Cover logs, metrics, traces, dashboards, alerts, health checks, sampling, retention, and incident evidence quality.";
  }
  if (lowerTitle === "ci") {
    return "Cover required checks, branch protection, pipeline stages, artifacts, failure policy, local parity, and stop conditions.";
  }
  if (lowerTitle.includes("release")) {
    return "Cover release types, versioning, pre-release checklist, deployment flow, post-deploy verification, stop conditions, and owner handoff.";
  }
  if (lowerTitle.includes("rollback")) {
    return [
      "Provide a short actionable decision tree with triggers, procedure, database rollback policy,",
      "validation, owners, and forward-fix criteria.",
    ].join(" ");
  }
  if (lowerTitle.includes("config")) {
    return "Treat configuration as a runtime contract with defaults, environment ownership, validation, reload policy, and drift handling.";
  }
  if (lowerTitle.includes("secrets")) {
    return "Separate secrets from regular config and include inventory, access, rotation, CI/deployment handling, logs, and leak response.";
  }
  if (lowerTitle.includes("backup")) {
    return "Focus on restore, including restore owner, schedule, test cadence, RTO, RPO, integrity checks, and partial restore behavior.";
  }
  return "Define severity, roles, first 10 minutes, communication, timeline, postmortem, follow-up policy, and evidence preservation.";
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

export function validationDoc(title: string, scope: Scope, profile: Profile, addons: readonly Addon[] = []): string {
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

export function checklistDoc(title: string): string {
  const lower = title.toLowerCase();
  const checklist = checklistContent(lower);

  return `# ${title}

${documentMetadata([["Status", "Draft"]])}

## Failure Modes

${checklist.failureModes}

## Checklist

${checklist.items.map((item) => `- ${item}`).join("\n")}

## Validation

- Required validation names: ${checklist.validations.join(", ")}
- Skipped validation must include a reason and remaining risk.
`;
}

function checklistContent(lowerTitle: string): {
  readonly failureModes: string;
  readonly items: readonly string[];
  readonly validations: readonly string[];
} {
  if (lowerTitle.includes("backend api")) {
    return {
      failureModes: "Auth, authorization, OpenAPI drift, error shape drift, pagination bugs, idempotency gaps, missing logs, and missing tests.",
      items: [
        "`api/openapi.yaml` describes every changed request, response, parameter, and error.",
        "Authentication and authorization behavior is explicit for success and denial cases.",
        "Pagination uses stable cursors or documented limits and does not expose unbounded reads.",
        "`Idempotency-Key` behavior is defined for create or retry-prone operations.",
        "Logs include correlation evidence without secrets or private payloads.",
        "Contract, negative-path, and smoke validation are run or explicitly skipped.",
      ],
      validations: ["contract", "test", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("frontend ui")) {
    return {
      failureModes: [
        "Route drift, unclear state ownership, component boundary leakage, accessibility regressions,",
        "missing loading/empty/error/disabled states, form bugs, and missing tests.",
      ].join(" "),
      items: [
        "`docs/frontend/FRONTEND_DESIGN.md` names the changed route, page model, and component boundary.",
        "Server State, URL State, Form State, Local UI State, and allowed Global Client State are separated.",
        "Loading, empty, error, and disabled states are visible for each async interaction.",
        "Keyboard navigation, focus movement, labels, landmarks, and screen-reader announcements are covered.",
        "Form validation identifies client-only checks and backend contract checks.",
        "Frontend tests or smoke checks cover the main route and at least one failure state.",
      ],
      validations: ["lint", "typecheck", "test", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("db migration")) {
    return {
      failureModes: "Unsafe expand-contract rollout, missing rollback or forward-fix path, large table locks, unsafe indexes, and weak data verification.",
      items: [
        "`db/schema.dbml` and migration notes agree on source-of-truth structure.",
        "The migration separates expand, backfill, switch, and contract phases when needed.",
        "Large table operations have lock, timeout, batching, and index-build risk called out.",
        "Rollback or forward-fix behavior is documented for every irreversible step.",
        "Data verification queries or checks are named before and after deployment.",
      ],
      validations: ["migration-check", "test", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("security")) {
    return {
      failureModes: "Auth bypass, authorization gaps, tenant leakage, unsafe inputs or outputs, secret exposure, log leakage, and risky external integrations.",
      items: [
        "Authentication and authorization checks are owned by the correct boundary.",
        "Tenant, organization, and user ownership checks cannot be bypassed through alternate paths.",
        "Inputs and outputs are validated at trust boundaries.",
        "Secrets are not committed, logged, copied into examples, or exposed through generated artifacts.",
        "External integrations document scopes, retries, error handling, and redaction.",
        "Tracked secret files and `.gitignore` exceptions are reviewed.",
      ],
      validations: ["lint", "test", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("performance")) {
    return {
      failureModes: "Latency regression, oversized payloads, excess queries, missing cache policy, bundle growth, background job pressure, and hot-path churn.",
      items: [
        "The affected user journey or hot path is named.",
        "Latency, payload, query count, cache, bundle, or job budget is stated or marked UNDECIDED.",
        "Repeated I/O, cross-boundary calls, and avoidable allocations are reviewed.",
        "Cache behavior includes invalidation, freshness, and fallback expectations.",
        "Performance validation evidence or a reason for skipping it is included.",
      ],
      validations: ["test", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("ops")) {
    return {
      failureModes: [
        "CI drift, unsafe release, unclear rollback, missing observability, config drift,",
        "secret handling gaps, backup risk, and incident response gaps.",
      ].join(" "),
      items: [
        "CI checks and local validation names are aligned with `VALIDATION.md`.",
        "Release and rollback conditions are explicit before deployment.",
        "Logs, metrics, traces, dashboards, alerts, and health checks cover the changed behavior.",
        "Config and secrets changes have owners, defaults, validation, and leak response.",
        "Backup, restore, and incident-response docs are updated when operational risk changes.",
        "Repository hygiene changes are reviewed for line endings, binary diffs, tracked secrets, and ignored artifacts.",
      ],
      validations: ["docs", "smoke", "check"],
    };
  }
  if (lowerTitle.includes("dependency")) {
    return {
      failureModes: "Unnecessary dependency, weak maintenance, license mismatch, vulnerability exposure, runtime or bundle impact, and high removal cost.",
      items: [
        "The dependency need is tied to a source-of-truth requirement.",
        "Native alternatives, existing dependencies, and smaller packages were considered.",
        "License, maintenance health, release cadence, and security posture are reviewed.",
        "Runtime, bundle, install, transitive dependency, and platform impacts are understood.",
        "Major upgrades include migration notes, rollback or pinning strategy, and removal cost.",
      ],
      validations: ["lint", "typecheck", "test", "check"],
    };
  }
  return {
    failureModes: "Source-of-truth drift, missing validation, missing tests, rollback gaps, and ownership ambiguity.",
    items: [
      "The source of truth is named before editing.",
      "Ownership boundaries and out-of-scope surfaces are respected.",
      "Required validation names from `VALIDATION.md` are selected.",
      "Tests or explicit skipped-check reasons are recorded.",
      "Rollback, recovery, or undo behavior is documented when risk is not trivial.",
    ],
    validations: ["test", "docs", "check"],
  };
}

export function agentSkill(name: string): string {
  return `---
name: ${name}
description: Use this when working on ${name} changes in this repository scaffold.
---

# ${name}

## Read First

- AGENTS.md
- VALIDATION.md
- CHECKLIST.md
- .agents/context-map.md

## Procedure

1. Identify the source of truth.
2. Read the matching checklist.
3. Make the smallest change that preserves ownership boundaries.
4. Validate with the stable validation names from VALIDATION.md.

## Never

- Do not invent product-specific technology choices.
- Do not generate fake credentials or secrets.
- Do not treat generated/cache/build output as source truth.

## Checklist

- Source of truth confirmed.
- Failure mode checklist reviewed.
- Validation plan stated.

## Validation

Use stable validation names only. If a runner command is unconfigured, report it as skipped with reason.

## Final Report

List files changed, validations run, validations skipped, skip reasons, and remaining risk.
`;
}

export function frontendDesignDoc(): string {
  const sections = [
    "0. Decision Summary",
    "1. Product Surface and Scope",
    "2. User Flow Map",
    "3. Routing Contract",
    "4. Page and Layout Model",
    "5. State Ownership Model",
    "6. Data Fetching and Cache Policy",
    "7. Component Boundary Model",
    "8. Design Token Contract",
    "9. Interaction and Accessibility Contract",
    "10. Loading, Empty, Error, and Disabled States",
    "11. Form and Validation Model",
    "12. Responsive and Layout Rules",
    "13. Observability and Analytics",
    "14. Test Strategy",
    "15. Implementation Sequence",
    "16. Open Questions and Decisions Log",
  ];
  return `# Frontend Design

${documentMetadata([["Status", "Draft"]])}

${sections
  .map(
    (section) => `## ${section}

${frontendSectionPrompt(section)}
`,
  )
  .join("\n")}
## State Definitions

- Server State: remote data owned by backend contracts.
- URL State: route, query, and hash data that must survive reload and share links.
- Form State: draft user input owned by a form boundary.
- Local UI State: temporary visual or interaction state owned by one component area.
- Global Client State: client-owned state allowed only by explicit allowlist.

## Global State Allowlist

- Auth session summary when required.
- Current tenant or organization selection when required.
- Feature flags when required.

## Global State Denylist

- Server response copies.
- Form drafts.
- One-off modal state.
- Derived values that can be computed locally.

## Component Layers

app -> pages -> features -> entities -> shared.

Imports may point downward only. Shared must not import entities, features, pages, or app.

## State Categories

Loading, empty, error, and disabled states must be defined per route and per async interaction.

## Accessibility Contract

Keyboard paths, focus movement, visible focus, labels, semantic landmarks, and screen-reader announcements must be explicit before implementation.

## Semantic Token Usage

Use semantic tokens for color, spacing, typography, state, and surface role. Do not hardcode product-specific visual choices here.
`;
}

function frontendSectionPrompt(section: string): string {
  if (section.includes("Decision Summary")) {
    return "Record accepted decisions, rejected options, owners, and remaining UNDECIDED items.";
  }
  if (section.includes("Product Surface")) {
    return "Name the product surface, primary users, entry points, non-goals, and ownership boundary.";
  }
  if (section.includes("User Flow")) {
    return "Map happy paths, failure paths, permission paths, and recovery paths.";
  }
  if (section.includes("Routing")) {
    return "List routes, URL parameters, query parameters, redirects, and not-found behavior.";
  }
  if (section.includes("Page and Layout")) {
    return "Define page shells, persistent regions, scroll behavior, responsive breakpoints, and empty layouts.";
  }
  if (section.includes("State Ownership")) {
    return "Assign Server State, URL State, Form State, Local UI State, and allowed Global Client State.";
  }
  if (section.includes("Data Fetching")) {
    return "Define fetch timing, cache keys, invalidation, retry, optimistic updates, and stale data behavior.";
  }
  if (section.includes("Component Boundary")) {
    return "Describe app/pages/features/entities/shared layers, import direction, and reusable component limits.";
  }
  if (section.includes("Design Token")) {
    return "Name semantic token roles for color, spacing, typography, surfaces, status, and interaction states.";
  }
  if (section.includes("Interaction and Accessibility")) {
    return "Define keyboard paths, focus order, labels, landmarks, announcements, and reduced-motion expectations.";
  }
  if (section.includes("Loading")) {
    return "List loading, empty, error, and disabled states for each route and async action.";
  }
  if (section.includes("Form")) {
    return "Separate client validation, backend validation, error display, dirty state, submit, reset, and recovery.";
  }
  if (section.includes("Responsive")) {
    return "Define width ranges, wrapping rules, long-content behavior, viewport constraints, and safe-area handling.";
  }
  if (section.includes("Observability")) {
    return "Name events, analytics, logs, client errors, performance marks, and privacy limits.";
  }
  if (section.includes("Test Strategy")) {
    return "Map unit, component, route, accessibility, contract, and smoke coverage to user-visible risks.";
  }
  if (section.includes("Implementation Sequence")) {
    return "Break work into safe slices with validation after each slice.";
  }
  return "Track open questions, decision owners, due dates, and decision-reversing evidence.";
}

export function openApiSkeleton(): string {
  return `openapi: 3.1.0
info:
  title: UNDECIDED Resource API
  version: 0.0.0
servers:
  - url: https://api.example.invalid
    description: UNDECIDED
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  parameters:
    Limit:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 25
    Cursor:
      name: cursor
      in: query
      schema:
        type:
          - string
          - "null"
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      schema:
        type: string
  schemas:
    Resource:
      type: object
      required: [id, type]
      properties:
        id:
          type: string
        type:
          type: string
          const: Resource
    CreateResourceRequest:
      type: object
      required: [type]
      properties:
        type:
          type: string
          const: Resource
    SuccessResponse:
      type: object
      required: [data]
      properties:
        data:
          $ref: "#/components/schemas/Resource"
    PaginatedResponse:
      type: object
      required: [data, page]
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Resource"
        page:
          type: object
          required: [limit, nextCursor]
          properties:
            limit:
              type: integer
              minimum: 1
              maximum: 100
            nextCursor:
              type:
                - string
                - "null"
    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            requestId:
              type: string
security:
  - bearerAuth: []
paths:
  /health:
    get:
      security: []
      responses:
        "200":
          description: Health check
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: ok
  /v1/resources:
    get:
      parameters:
        - $ref: "#/components/parameters/Limit"
        - $ref: "#/components/parameters/Cursor"
      responses:
        "200":
          description: List resources
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PaginatedResponse"
    post:
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateResourceRequest"
      responses:
        "201":
          description: Create resource
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"
        default:
          description: Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
  /v1/resources/{resourceId}:
    get:
      parameters:
        - name: resourceId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Get resource
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"
        default:
          description: Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
`;
}

export function dbml(): string {
  return `Table users {
  id uuid [pk]
  email varchar [not null, unique]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table organizations {
  id uuid [pk]
  name varchar [not null]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table organization_members {
  organization_id uuid [not null, ref: > organizations.id]
  user_id uuid [not null, ref: > users.id]
  role varchar [not null]
  created_at timestamp [not null]

  indexes {
    (organization_id, user_id) [pk]
    user_id
    (organization_id, role)
  }
}
`;
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
