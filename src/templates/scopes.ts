import type { Addon, Density, FileKind, Profile, Runner, Scope, TemplateFile } from "../core/types.js";
import {
  agentSkill,
  architectureDoc,
  backendDoc,
  checklistDoc,
  contextMap,
  dbml,
  documentMetadata,
  docsReadme,
  frontendDesignDoc,
  githubIssueTemplate,
  engineeringDoc,
  markdownDoc,
  openApiSkeleton,
  opsDoc,
  rootAgents,
  rootReadme,
  validationDoc,
} from "./documents.js";
import { profileFilesFor } from "./profiles.js";
import { runnerFiles } from "./runners.js";

interface FileSpec {
  readonly path: string;
  readonly kind: FileKind;
  readonly renderer: Renderer;
  readonly title?: string;
  readonly density?: readonly Density[];
}

type Renderer =
  | "editorconfig"
  | "gitattributes"
  | "gitignore"
  | "root-agents"
  | "root-readme"
  | "validation"
  | "checklist-router"
  | "docs-readme"
  | "context-map"
  | "agent-skill"
  | "checklist"
  | "openapi"
  | "success-json"
  | "error-json"
  | "paginated-json"
  | "dbml"
  | "frontend-design"
  | "backend-doc"
  | "engineering-doc"
  | "ops-doc"
  | "architecture-doc"
  | "mermaid"
  | "pull-request-template"
  | "codeowners"
  | "issue-template"
  | "markdown";

const allDensities = ["minimal", "standard", "strict"] as const satisfies readonly Density[];
const standardAndStrict = ["standard", "strict"] as const satisfies readonly Density[];
const strictOnly = ["strict"] as const satisfies readonly Density[];

function file(path: string, kind: FileKind, renderer: Renderer, title?: string, density: readonly Density[] = standardAndStrict): FileSpec {
  return title === undefined ? { path, kind, renderer, density } : { path, kind, renderer, title, density };
}

const commonFiles: readonly FileSpec[] = [
  file(".editorconfig", "hygiene", "editorconfig", undefined, allDensities),
  file(".gitattributes", "hygiene", "gitattributes", undefined, allDensities),
  file(".gitignore", "hygiene", "gitignore", undefined, allDensities),
  file("AGENTS.md", "agent", "root-agents", undefined, allDensities),
  file("README.md", "document", "root-readme", undefined, allDensities),
  file("CHECKLIST.md", "checklist", "checklist-router", "Checklist Router", allDensities),
  file("VALIDATION.md", "validation", "validation", undefined, allDensities),
  file(".agents/README.md", "agent", "markdown", "Agent Workspace", allDensities),
  file(".agents/context-map.md", "agent", "context-map", undefined, allDensities),
  file("docs/README.md", "document", "docs-readme", undefined, allDensities),
  file("docs/product/00-product-brief.md", "document", "markdown", "Product Brief", allDensities),
  file("docs/product/02-spec.md", "document", "markdown", "Product Specification", allDensities),
  file("docs/architecture/00-system-boundary.md", "document", "architecture-doc", "System Boundary", allDensities),
  file("docs/engineering/00-project-invariants.md", "document", "engineering-doc", "Project Invariants", allDensities),
  file("docs/ops/00-operational-contract.md", "document", "ops-doc", "Operational Contract", allDensities),
  file(".agents/checklists/security.md", "checklist", "checklist", "Security Checklist", allDensities),
  file(".agents/checklists/ops-change.md", "checklist", "checklist", "Ops Change Checklist", allDensities),
  file(".agents/skills/feature/SKILL.md", "agent", "agent-skill", "feature", allDensities),
  file(".agents/skills/bugfix/SKILL.md", "agent", "agent-skill", "bugfix", allDensities),
  file(".github/PULL_REQUEST_TEMPLATE.md", "github", "pull-request-template", "Pull Request Template", allDensities),
  file("CONTRIBUTING.md", "document", "markdown", "Contributing"),
  file("DEVELOPMENT.md", "document", "markdown", "Development"),
  file("ARCHITECTURE.md", "document", "architecture-doc", "Architecture"),
  file(".agents/checklists/performance.md", "checklist", "checklist", "Performance Checklist"),
  file(".agents/checklists/dependency.md", "checklist", "checklist", "Dependency Checklist"),
  file(".agents/validations/default.md", "validation", "validation", "Default Validation"),
  file(".agents/validations/ops-change.md", "validation", "validation", "Ops Change Validation"),
  file(".agents/validations/dependency-upgrade.md", "validation", "validation", "Dependency Upgrade Validation"),
  file(".agents/skills/refactor/SKILL.md", "agent", "agent-skill", "refactor"),
  file(".agents/skills/ops-change/SKILL.md", "agent", "agent-skill", "ops-change"),
  file(".agents/skills/dependency-upgrade/SKILL.md", "agent", "agent-skill", "dependency-upgrade"),
  file(".agents/skills/test-hardening/SKILL.md", "agent", "agent-skill", "test-hardening"),
  file("docs/product/01-roadmap.md", "document", "markdown", "Roadmap"),
  file("docs/product/03-risk-register.md", "document", "markdown", "Risk Register"),
  file("docs/architecture/01-domain-model.md", "document", "architecture-doc", "Domain Model"),
  file("docs/architecture/02-runtime-flow.md", "document", "architecture-doc", "Runtime Flow"),
  file("docs/architecture/03-quality-attributes.md", "document", "architecture-doc", "Quality Attributes"),
  file("docs/adr/README.md", "document", "markdown", "Architecture Decisions"),
  file("docs/adr/0000-template.md", "document", "markdown", "ADR Template"),
  file("docs/adr/0001-initial-architecture-boundaries.md", "document", "markdown", "Initial Architecture Boundaries"),
  file("docs/adr/0002-contract-source-of-truth.md", "document", "markdown", "Contract Source of Truth"),
  file("docs/engineering/01-design-review-questions.md", "document", "engineering-doc", "Design Review Questions"),
  file("docs/engineering/02-code-review-checklist.md", "document", "engineering-doc", "Code Review Checklist"),
  file("docs/engineering/03-performance-budget.md", "document", "engineering-doc", "Performance Budget"),
  file("docs/engineering/04-security-baseline.md", "document", "engineering-doc", "Security Baseline"),
  file("docs/engineering/05-testing-standard.md", "document", "engineering-doc", "Testing Standard"),
  file("docs/engineering/06-dependency-and-change-policy.md", "document", "engineering-doc", "Dependency and Change Policy"),
  file("docs/engineering/07-operability-and-failure-standard.md", "document", "engineering-doc", "Operability and Failure Standard"),
  file("docs/ops/observability.md", "document", "ops-doc", "Observability"),
  file("docs/ops/ci.md", "document", "ops-doc", "CI"),
  file("docs/ops/release.md", "document", "ops-doc", "Release"),
  file("docs/ops/rollback.md", "document", "ops-doc", "Rollback"),
  file("docs/ops/config-and-env.md", "document", "ops-doc", "Config and Environment"),
  file("docs/ops/secrets.md", "document", "ops-doc", "Secrets"),
  file("docs/ops/backup-and-restore.md", "document", "ops-doc", "Backup and Restore"),
  file("docs/ops/incident-response.md", "document", "ops-doc", "Incident Response"),
  file("diagrams/README.md", "diagram", "markdown", "Diagrams"),
  file("diagrams/system-context.mmd", "diagram", "mermaid", "system-context"),
  file("diagrams/container-view.mmd", "diagram", "mermaid", "container-view"),
  file("diagrams/core-runtime-flow.mmd", "diagram", "mermaid", "core-runtime-flow"),
  file("diagrams/release-flow.mmd", "diagram", "mermaid", "release-flow"),
  file("diagrams/rollback-flow.mmd", "diagram", "mermaid", "rollback-flow"),
  file(".github/CODEOWNERS", "github", "codeowners"),
  file(".github/ISSUE_TEMPLATE/bug-report.md", "github", "issue-template", "Bug Report"),
  file(".github/ISSUE_TEMPLATE/design-change.md", "github", "issue-template", "Design Change"),
  file(".github/ISSUE_TEMPLATE/architecture-question.md", "github", "issue-template", "Architecture Question"),
  file(".github/ISSUE_TEMPLATE/risk-register-item.md", "github", "issue-template", "Risk Register Item"),
  file("docs/engineering/08-threat-model.md", "document", "engineering-doc", "Threat Model", strictOnly),
  file("docs/engineering/09-data-integrity.md", "document", "engineering-doc", "Data Integrity", strictOnly),
  file("docs/ops/disaster-recovery.md", "document", "ops-doc", "Disaster Recovery", strictOnly),
  file("docs/ops/service-levels.md", "document", "ops-doc", "Service Levels", strictOnly),
  file(".agents/checklists/release-readiness.md", "checklist", "checklist", "Release Readiness Checklist", strictOnly),
  file(".agents/validations/release-readiness.md", "validation", "validation", "Release Readiness Validation", strictOnly),
];

const backendFiles: readonly FileSpec[] = [
  file("docs/backend/README.md", "document", "backend-doc", "Backend", allDensities),
  file("docs/backend/00-api-server-boundary.md", "document", "backend-doc", "API Server Boundary", allDensities),
  file("api/openapi.yaml", "contract", "openapi", undefined, allDensities),
  file(".agents/skills/backend-api/SKILL.md", "agent", "agent-skill", "backend-api", allDensities),
  file(".agents/checklists/backend-api.md", "checklist", "checklist", "Backend API Checklist", allDensities),
  file("api/examples/success-response.json", "contract", "success-json"),
  file("api/examples/error-response.json", "contract", "error-json"),
  file("api/examples/paginated-response.json", "contract", "paginated-json"),
  file("docs/backend/01-authentication.md", "document", "backend-doc", "Authentication"),
  file("docs/backend/02-authorization.md", "document", "backend-doc", "Authorization"),
  file("docs/backend/03-persistence-model.md", "document", "backend-doc", "Persistence Model"),
  file("docs/backend/04-http-api-policy.md", "document", "backend-doc", "HTTP API Policy"),
  file("docs/backend/05-error-response.md", "document", "backend-doc", "Error Response"),
  file("docs/backend/06-logging-and-observability.md", "document", "backend-doc", "Logging and Observability"),
  file("docs/backend/07-migration-strategy.md", "document", "backend-doc", "Migration Strategy"),
  file("docs/backend/08-backend-security.md", "document", "backend-doc", "Backend Security"),
  file("db/schema.dbml", "contract", "dbml"),
  file("db/migrations/README.md", "document", "markdown", "Migrations"),
  file("db/seed/README.md", "document", "markdown", "Seed Data"),
  file("diagrams/data-model.mmd", "diagram", "mermaid", "data-model"),
  file("diagrams/auth-flow.mmd", "diagram", "mermaid", "auth-flow"),
  file("diagrams/authorization-flow.mmd", "diagram", "mermaid", "authorization-flow"),
  file("diagrams/request-lifecycle.mmd", "diagram", "mermaid", "request-lifecycle"),
  file(".agents/skills/db-migration/SKILL.md", "agent", "agent-skill", "db-migration"),
  file(".agents/checklists/db-migration.md", "checklist", "checklist", "DB Migration Checklist"),
  file(".agents/validations/backend-api.md", "validation", "validation", "Backend API Validation"),
  file(".agents/validations/db-migration.md", "validation", "validation", "DB Migration Validation"),
  file("docs/backend/09-api-evolution.md", "document", "backend-doc", "API Evolution", strictOnly),
  file("docs/backend/10-data-integrity.md", "document", "backend-doc", "Backend Data Integrity", strictOnly),
];

const frontendFiles: readonly FileSpec[] = [
  file("docs/frontend/FRONTEND_DESIGN.md", "document", "frontend-design", undefined, allDensities),
  file("docs/integrations/backend-api.md", "document", "markdown", "Backend API Integration", allDensities),
  file("contracts/backend-api/openapi.yaml", "contract", "openapi", undefined, allDensities),
  file(".agents/skills/frontend-ui/SKILL.md", "agent", "agent-skill", "frontend-ui", allDensities),
  file(".agents/checklists/frontend-ui.md", "checklist", "checklist", "Frontend UI Checklist", allDensities),
  file("contracts/backend-api/README.md", "contract", "markdown", "Backend API Contract"),
  file("contracts/backend-api/examples/success-response.json", "contract", "success-json"),
  file("contracts/backend-api/examples/error-response.json", "contract", "error-json"),
  file("contracts/backend-api/examples/paginated-response.json", "contract", "paginated-json"),
  file("diagrams/user-flow.mmd", "diagram", "mermaid", "user-flow"),
  file("diagrams/route-map.mmd", "diagram", "mermaid", "route-map"),
  file("diagrams/state-ownership.mmd", "diagram", "mermaid", "state-ownership"),
  file("diagrams/component-boundary.mmd", "diagram", "mermaid", "component-boundary"),
  file("diagrams/request-lifecycle.mmd", "diagram", "mermaid", "request-lifecycle"),
  file(".agents/checklists/accessibility.md", "checklist", "checklist", "Accessibility Checklist"),
  file(".agents/validations/frontend-ui.md", "validation", "validation", "Frontend UI Validation"),
  file("docs/frontend/accessibility.md", "document", "markdown", "Accessibility", strictOnly),
  file("docs/frontend/state-and-cache.md", "document", "markdown", "State and Cache", strictOnly),
];

const mobileFiles: readonly FileSpec[] = [
  file("docs/mobile/README.md", "document", "markdown", "Mobile", allDensities),
  file("docs/mobile/app-contract.md", "document", "markdown", "Mobile App Contract", allDensities),
  file("docs/mobile/platform-support.md", "document", "markdown", "Mobile Platform Support", standardAndStrict),
  file("docs/mobile/offline-and-sync.md", "document", "markdown", "Offline and Sync", standardAndStrict),
  file("docs/mobile/store-release.md", "document", "markdown", "Store Release", strictOnly),
  file(".agents/skills/mobile-app/SKILL.md", "agent", "agent-skill", "mobile-app", allDensities),
  file(".agents/checklists/mobile-app.md", "checklist", "checklist", "Mobile App Checklist", allDensities),
  file(".agents/validations/mobile-app.md", "validation", "validation", "Mobile App Validation", standardAndStrict),
  file("diagrams/mobile-user-flow.mmd", "diagram", "mermaid", "mobile-user-flow", standardAndStrict),
];

const infraFiles: readonly FileSpec[] = [
  file("docs/infra/README.md", "document", "markdown", "Infrastructure", allDensities),
  file("docs/infra/module-contract.md", "document", "markdown", "Infrastructure Module Contract", allDensities),
  file("docs/infra/environments.md", "document", "markdown", "Environments", standardAndStrict),
  file("docs/infra/change-plan.md", "document", "markdown", "Infrastructure Change Plan", standardAndStrict),
  file("docs/infra/drift-and-rollback.md", "document", "markdown", "Drift and Rollback", strictOnly),
  file(".agents/skills/infra-change/SKILL.md", "agent", "agent-skill", "infra-change", allDensities),
  file(".agents/checklists/infra-change.md", "checklist", "checklist", "Infrastructure Change Checklist", allDensities),
  file(".agents/validations/infra-change.md", "validation", "validation", "Infrastructure Change Validation", standardAndStrict),
  file("diagrams/infra-boundary.mmd", "diagram", "mermaid", "infra-boundary", standardAndStrict),
];

const dataFiles: readonly FileSpec[] = [
  file("docs/data/README.md", "document", "markdown", "Data", allDensities),
  file("docs/data/pipeline-contract.md", "document", "markdown", "Pipeline Contract", allDensities),
  file("docs/data/lineage.md", "document", "markdown", "Data Lineage", standardAndStrict),
  file("docs/data/quality.md", "document", "markdown", "Data Quality", standardAndStrict),
  file("docs/data/privacy-and-retention.md", "document", "markdown", "Privacy and Retention", strictOnly),
  file(".agents/skills/data-pipeline/SKILL.md", "agent", "agent-skill", "data-pipeline", allDensities),
  file(".agents/checklists/data-pipeline.md", "checklist", "checklist", "Data Pipeline Checklist", allDensities),
  file(".agents/validations/data-pipeline.md", "validation", "validation", "Data Pipeline Validation", standardAndStrict),
  file("diagrams/data-lineage.mmd", "diagram", "mermaid", "data-lineage", standardAndStrict),
];

export function templateFilesFor(
  scope: Scope,
  runner: Runner,
  profile: Profile = "generic",
  density: Density = "standard",
  addons: readonly Addon[] = [],
): readonly TemplateFile[] {
  const scopedFiles = [
    ...commonFiles,
    ...(scope === "backend" || scope === "fullstack" ? backendFiles : []),
    ...(scope === "frontend" || scope === "fullstack" ? frontendFilesFor(scope) : []),
    ...(scope === "mobile" ? mobileFiles : []),
    ...(scope === "infra" ? infraFiles : []),
    ...(scope === "data" ? dataFiles : []),
  ].filter((file) => includesDensity(file, density));

  const renderedScopedFiles = scopedFiles.map((file) => renderFile(file, scope, profile, addons, density));
  const scopedPaths = new Set(renderedScopedFiles.map((file) => file.path));
  const files = [...renderedScopedFiles, ...profileFilesFor(profile, scope, density, addons).filter((file) => !scopedPaths.has(file.path)), ...runnerFiles(runner)];
  assertUniqueTemplatePaths(files);
  return files;
}

function frontendFilesFor(scope: Scope): readonly FileSpec[] {
  if (scope !== "fullstack") {
    return frontendFiles;
  }
  return frontendFiles.filter((file) => !file.path.startsWith("contracts/backend-api/") && file.path !== "diagrams/request-lifecycle.mmd");
}

function includesDensity(file: FileSpec, density: Density): boolean {
  return file.density?.includes(density) ?? density !== "minimal";
}

function assertUniqueTemplatePaths(files: readonly TemplateFile[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path)) {
      duplicates.add(file.path);
    }
    seen.add(file.path);
  }
  if (duplicates.size > 0) {
    throw new Error(`Duplicate template paths: ${[...duplicates].sort().join(", ")}`);
  }
}

function renderFile(file: FileSpec, scope: Scope, profile: Profile, addons: readonly Addon[], density: Density): TemplateFile {
  switch (file.renderer) {
    case "editorconfig":
      return { ...file, content: editorconfig() };
    case "gitattributes":
      return { ...file, content: gitattributes() };
    case "gitignore":
      return { ...file, content: gitignoreBlock(), merge: "gitignore" };
    case "root-agents":
      return { ...file, content: rootAgents(scope, profile, addons, density) };
    case "root-readme":
      return { ...file, content: rootReadme(scope, profile, addons) };
    case "validation":
      return { ...file, content: validationDoc(file.title ?? "Validation", scope, profile, addons) };
    case "checklist-router":
      return { ...file, content: checklistRouter(scope, profile, addons, density) };
    case "docs-readme":
      return { ...file, content: docsReadme(scope, profile, addons, density) };
    case "context-map":
      return { ...file, content: contextMap(scope, profile, addons, density) };
    case "agent-skill":
      return { ...file, content: agentSkill(file.title ?? "agent-skill") };
    case "checklist":
      return { ...file, content: checklistDoc(file.title ?? file.path) };
    case "openapi":
      return { ...file, content: openApiSkeleton() };
    case "success-json":
      return { ...file, content: `${JSON.stringify({ data: { id: "resource_UNDECIDED", type: "Resource" } }, null, 2)}\n` };
    case "error-json":
      return {
        ...file,
        content: `${JSON.stringify(
          {
            error: {
              code: "UNDECIDED_ERROR",
              message: "A safe public error message.",
              requestId: "req_UNDECIDED",
            },
          },
          null,
          2,
        )}\n`,
      };
    case "paginated-json":
      return { ...file, content: `${JSON.stringify({ data: [], page: { limit: 25, nextCursor: null } }, null, 2)}\n` };
    case "dbml":
      return { ...file, content: dbml() };
    case "frontend-design":
      return { ...file, content: frontendDesignDoc() };
    case "backend-doc":
      return { ...file, content: backendDoc(file.title ?? file.path) };
    case "engineering-doc":
      return { ...file, content: engineeringDoc(file.title ?? file.path) };
    case "ops-doc":
      return { ...file, content: opsDoc(file.title ?? file.path) };
    case "architecture-doc":
      return { ...file, content: architectureDoc(file.title ?? file.path) };
    case "mermaid":
      return { ...file, content: mermaid(file.title ?? "diagram") };
    case "pull-request-template":
      return { ...file, content: pullRequestTemplate() };
    case "codeowners":
      return { ...file, content: "# Replace @REPLACE_WITH_OWNER with your GitHub user or team before enabling CODEOWNERS.\n# * @REPLACE_WITH_OWNER\n" };
    case "issue-template":
      return { ...file, content: githubIssueTemplate(file.title ?? "Issue") };
    case "markdown":
      return { ...file, content: markdownDoc(file.title ?? file.path) };
  }
}

function editorconfig(): string {
  return `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
`;
}

function gitattributes(): string {
  return `* text=auto eol=lf

*.md text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.json text eol=lf
*.toml text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.mjs text eol=lf
*.cjs text eol=lf
*.mmd text eol=lf
*.dbml text eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.pdf binary
*.zip binary
*.gz binary
*.tgz binary
*.mp4 binary
*.mov binary
`;
}

export function gitignoreBlock(): string {
  return `# >>> ssealed ignore patterns >>>
.DS_Store
Thumbs.db
.idea/
.vscode/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.env
.env.*
!.env.example
.ssealed-init.lock
node_modules/
dist/
build/
coverage/
.cache/
.tmp/
tmp/
*.tsbuildinfo
# <<< ssealed ignore patterns <<<
`;
}

function checklistRouter(scope: Scope, profile: Profile, addons: readonly Addon[], density: Density): string {
  const isMinimal = density === "minimal";
  const scopedRoutes = [
    ...(scope === "backend" || scope === "fullstack"
      ? ["- Backend API changes: .agents/checklists/backend-api.md", ...(isMinimal ? [] : ["- DB migration changes: .agents/checklists/db-migration.md"])]
      : []),
    ...(scope === "frontend" || scope === "fullstack"
      ? ["- Frontend UI changes: .agents/checklists/frontend-ui.md", ...(isMinimal ? [] : ["- Accessibility changes: .agents/checklists/accessibility.md"])]
      : []),
    ...(scope === "mobile" ? ["- Mobile app changes: .agents/checklists/mobile-app.md"] : []),
    ...(scope === "infra" ? ["- Infrastructure changes: .agents/checklists/infra-change.md"] : []),
    ...(scope === "data" ? ["- Data pipeline changes: .agents/checklists/data-pipeline.md"] : []),
    ...profileChecklistRoutes(profile, addons),
  ];
  const scopedRoutesBlock = scopedRoutes.length === 0 ? "" : `${scopedRoutes.join("\n")}\n`;

  return `# Checklist Router

${documentMetadata([["Status", "Draft"]])}

Use this file as a router. Do not turn it into one giant checklist.

- Feature work: .agents/skills/feature/SKILL.md and .agents/checklists/security.md${isMinimal ? "" : ", plus .agents/checklists/performance.md when performance is touched"}
- Bug fixes: .agents/skills/bugfix/SKILL.md and .agents/checklists/security.md when data or access is touched
- Ops changes: .agents/checklists/ops-change.md${isMinimal ? "" : " and .agents/skills/ops-change/SKILL.md"}
- Dependency changes: ${isMinimal ? "record the dependency risk here unless a project-owned dependency checklist exists" : ".agents/checklists/dependency.md and .agents/skills/dependency-upgrade/SKILL.md"}
- Repository hygiene changes: .agents/checklists/security.md and .agents/checklists/ops-change.md
${scopedRoutesBlock}`;
}

function profileChecklistRoutes(profile: Profile, addons: readonly Addon[]): readonly string[] {
  return profileList(profile, addons).map((value) => `- ${profileChecklistLabel(value)} changes: .agents/checklists/${profileChecklistSlug(value)}.md`);
}

function profileList(profile: Profile, addons: readonly Addon[]): readonly Addon[] {
  return [profile, ...addons].filter((value): value is Addon => value !== "generic");
}

function profileChecklistSlug(profile: Addon): string {
  return profile === "library" ? "library-package" : profile;
}

function profileChecklistLabel(profile: Addon): string {
  if (profile === "cli-tool") return "CLI tool";
  if (profile === "api-service") return "API service";
  if (profile === "desktop-app") return "Desktop app";
  if (profile === "library") return "Library package";
  if (profile === "web-app") return "Web app";
  if (profile === "mobile-app") return "Mobile app";
  if (profile === "sdk") return "SDK";
  if (profile === "worker-service") return "Worker service";
  if (profile === "infra-module") return "Infrastructure module";
  if (profile === "data-pipeline") return "Data pipeline";
  if (profile === "github-action") return "GitHub Action";
  if (profile === "browser-extension") return "Browser extension";
  if (profile === "plugin") return "Plugin";
  if (profile === "docs-site") return "Docs site";
  return "Monorepo";
}

function mermaid(name: string): string {
  const safeName = name.replace(/[^A-Za-z0-9_]/gu, "_");
  return `flowchart TD
  A["${safeName}: input"] --> B["Review source of truth"]
  B --> C["Change plan"]
  C --> D["Validation"]
  D --> E["Release or rollback decision"]
`;
}

function pullRequestTemplate(): string {
  return `## What changed

## Why

## Related spec

## Related ADR

## API contract changes

## DB schema changes

## Hygiene file changes

## Risk

## Validation

## Skipped validation and reasons

## Design review checklist confirmation

## Performance budget confirmation

## Security baseline confirmation

## Testing standard confirmation

## Rollback or recovery path
`;
}
