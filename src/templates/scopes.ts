import type { FileKind, Runner, Scope, TemplateFile } from "../core/types.js";
import {
  agentSkill,
  architectureDoc,
  backendDoc,
  checklistDoc,
  contextMap,
  dbml,
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
import { runnerFiles } from "./runners.js";

interface FileSpec {
  readonly path: string;
  readonly kind: FileKind;
  readonly title?: string;
}

const commonFiles: readonly FileSpec[] = [
  { path: ".editorconfig", kind: "hygiene" },
  { path: ".gitattributes", kind: "hygiene" },
  { path: ".gitignore", kind: "hygiene" },
  { path: "AGENTS.md", kind: "agent" },
  { path: "README.md", kind: "document" },
  { path: "CONTRIBUTING.md", kind: "document", title: "Contributing" },
  { path: "DEVELOPMENT.md", kind: "document", title: "Development" },
  { path: "ARCHITECTURE.md", kind: "document", title: "Architecture" },
  { path: "CHECKLIST.md", kind: "checklist", title: "Checklist Router" },
  { path: "VALIDATION.md", kind: "validation" },
  { path: ".agents/README.md", kind: "agent", title: "Agent Workspace" },
  { path: ".agents/context-map.md", kind: "agent" },
  { path: ".agents/checklists/security.md", kind: "checklist", title: "Security Checklist" },
  { path: ".agents/checklists/performance.md", kind: "checklist", title: "Performance Checklist" },
  { path: ".agents/checklists/ops-change.md", kind: "checklist", title: "Ops Change Checklist" },
  { path: ".agents/checklists/dependency.md", kind: "checklist", title: "Dependency Checklist" },
  { path: ".agents/validations/default.md", kind: "validation", title: "Default Validation" },
  { path: ".agents/validations/ops-change.md", kind: "validation", title: "Ops Change Validation" },
  { path: ".agents/validations/dependency-upgrade.md", kind: "validation", title: "Dependency Upgrade Validation" },
  { path: ".agents/skills/feature/SKILL.md", kind: "agent", title: "feature" },
  { path: ".agents/skills/bugfix/SKILL.md", kind: "agent", title: "bugfix" },
  { path: ".agents/skills/refactor/SKILL.md", kind: "agent", title: "refactor" },
  { path: ".agents/skills/ops-change/SKILL.md", kind: "agent", title: "ops-change" },
  { path: ".agents/skills/dependency-upgrade/SKILL.md", kind: "agent", title: "dependency-upgrade" },
  { path: ".agents/skills/test-hardening/SKILL.md", kind: "agent", title: "test-hardening" },
  { path: "docs/README.md", kind: "document" },
  { path: "docs/product/00-product-brief.md", kind: "document", title: "Product Brief" },
  { path: "docs/product/01-roadmap.md", kind: "document", title: "Roadmap" },
  { path: "docs/product/02-spec.md", kind: "document", title: "Product Specification" },
  { path: "docs/product/03-risk-register.md", kind: "document", title: "Risk Register" },
  { path: "docs/architecture/00-system-boundary.md", kind: "document", title: "System Boundary" },
  { path: "docs/architecture/01-domain-model.md", kind: "document", title: "Domain Model" },
  { path: "docs/architecture/02-runtime-flow.md", kind: "document", title: "Runtime Flow" },
  { path: "docs/architecture/03-quality-attributes.md", kind: "document", title: "Quality Attributes" },
  { path: "docs/adr/README.md", kind: "document", title: "Architecture Decisions" },
  { path: "docs/adr/0000-template.md", kind: "document", title: "ADR Template" },
  { path: "docs/adr/0001-initial-architecture-boundaries.md", kind: "document", title: "Initial Architecture Boundaries" },
  { path: "docs/adr/0002-contract-source-of-truth.md", kind: "document", title: "Contract Source of Truth" },
  { path: "docs/engineering/00-project-invariants.md", kind: "document", title: "Project Invariants" },
  { path: "docs/engineering/01-design-review-questions.md", kind: "document", title: "Design Review Questions" },
  { path: "docs/engineering/02-code-review-checklist.md", kind: "document", title: "Code Review Checklist" },
  { path: "docs/engineering/03-performance-budget.md", kind: "document", title: "Performance Budget" },
  { path: "docs/engineering/04-security-baseline.md", kind: "document", title: "Security Baseline" },
  { path: "docs/engineering/05-testing-standard.md", kind: "document", title: "Testing Standard" },
  { path: "docs/engineering/06-dependency-and-change-policy.md", kind: "document", title: "Dependency and Change Policy" },
  { path: "docs/engineering/07-operability-and-failure-standard.md", kind: "document", title: "Operability and Failure Standard" },
  { path: "docs/ops/00-operational-contract.md", kind: "document", title: "Operational Contract" },
  { path: "docs/ops/observability.md", kind: "document", title: "Observability" },
  { path: "docs/ops/ci.md", kind: "document", title: "CI" },
  { path: "docs/ops/release.md", kind: "document", title: "Release" },
  { path: "docs/ops/rollback.md", kind: "document", title: "Rollback" },
  { path: "docs/ops/config-and-env.md", kind: "document", title: "Config and Environment" },
  { path: "docs/ops/secrets.md", kind: "document", title: "Secrets" },
  { path: "docs/ops/backup-and-restore.md", kind: "document", title: "Backup and Restore" },
  { path: "docs/ops/incident-response.md", kind: "document", title: "Incident Response" },
  { path: "diagrams/README.md", kind: "diagram", title: "Diagrams" },
  { path: "diagrams/system-context.mmd", kind: "diagram", title: "system-context" },
  { path: "diagrams/container-view.mmd", kind: "diagram", title: "container-view" },
  { path: "diagrams/core-runtime-flow.mmd", kind: "diagram", title: "core-runtime-flow" },
  { path: "diagrams/release-flow.mmd", kind: "diagram", title: "release-flow" },
  { path: "diagrams/rollback-flow.mmd", kind: "diagram", title: "rollback-flow" },
  { path: ".github/PULL_REQUEST_TEMPLATE.md", kind: "github", title: "Pull Request Template" },
  { path: ".github/CODEOWNERS", kind: "github" },
  { path: ".github/ISSUE_TEMPLATE/bug-report.md", kind: "github", title: "Bug Report" },
  { path: ".github/ISSUE_TEMPLATE/design-change.md", kind: "github", title: "Design Change" },
  { path: ".github/ISSUE_TEMPLATE/architecture-question.md", kind: "github", title: "Architecture Question" },
  { path: ".github/ISSUE_TEMPLATE/risk-register-item.md", kind: "github", title: "Risk Register Item" },
];

const backendFiles: readonly FileSpec[] = [
  { path: "docs/backend/README.md", kind: "document", title: "Backend" },
  { path: "docs/backend/00-api-server-boundary.md", kind: "document", title: "API Server Boundary" },
  { path: "docs/backend/01-authentication.md", kind: "document", title: "Authentication" },
  { path: "docs/backend/02-authorization.md", kind: "document", title: "Authorization" },
  { path: "docs/backend/03-persistence-model.md", kind: "document", title: "Persistence Model" },
  { path: "docs/backend/04-http-api-policy.md", kind: "document", title: "HTTP API Policy" },
  { path: "docs/backend/05-error-response.md", kind: "document", title: "Error Response" },
  { path: "docs/backend/06-logging-and-observability.md", kind: "document", title: "Logging and Observability" },
  { path: "docs/backend/07-migration-strategy.md", kind: "document", title: "Migration Strategy" },
  { path: "docs/backend/08-backend-security.md", kind: "document", title: "Backend Security" },
  { path: "api/openapi.yaml", kind: "contract" },
  { path: "api/examples/success-response.json", kind: "contract" },
  { path: "api/examples/error-response.json", kind: "contract" },
  { path: "api/examples/paginated-response.json", kind: "contract" },
  { path: "db/schema.dbml", kind: "contract" },
  { path: "db/migrations/README.md", kind: "document", title: "Migrations" },
  { path: "db/seed/README.md", kind: "document", title: "Seed Data" },
  { path: "diagrams/data-model.mmd", kind: "diagram", title: "data-model" },
  { path: "diagrams/auth-flow.mmd", kind: "diagram", title: "auth-flow" },
  { path: "diagrams/authorization-flow.mmd", kind: "diagram", title: "authorization-flow" },
  { path: "diagrams/request-lifecycle.mmd", kind: "diagram", title: "request-lifecycle" },
  { path: ".agents/skills/backend-api/SKILL.md", kind: "agent", title: "backend-api" },
  { path: ".agents/skills/db-migration/SKILL.md", kind: "agent", title: "db-migration" },
  { path: ".agents/checklists/backend-api.md", kind: "checklist", title: "Backend API Checklist" },
  { path: ".agents/checklists/db-migration.md", kind: "checklist", title: "DB Migration Checklist" },
  { path: ".agents/validations/backend-api.md", kind: "validation", title: "Backend API Validation" },
  { path: ".agents/validations/db-migration.md", kind: "validation", title: "DB Migration Validation" },
];

const frontendFiles: readonly FileSpec[] = [
  { path: "docs/frontend/FRONTEND_DESIGN.md", kind: "document" },
  { path: "docs/integrations/backend-api.md", kind: "document", title: "Backend API Integration" },
  { path: "contracts/backend-api/README.md", kind: "contract", title: "Backend API Contract" },
  { path: "contracts/backend-api/openapi.yaml", kind: "contract" },
  { path: "contracts/backend-api/examples/success-response.json", kind: "contract" },
  { path: "contracts/backend-api/examples/error-response.json", kind: "contract" },
  { path: "contracts/backend-api/examples/paginated-response.json", kind: "contract" },
  { path: "diagrams/user-flow.mmd", kind: "diagram", title: "user-flow" },
  { path: "diagrams/route-map.mmd", kind: "diagram", title: "route-map" },
  { path: "diagrams/state-ownership.mmd", kind: "diagram", title: "state-ownership" },
  { path: "diagrams/component-boundary.mmd", kind: "diagram", title: "component-boundary" },
  { path: "diagrams/request-lifecycle.mmd", kind: "diagram", title: "request-lifecycle" },
  { path: ".agents/skills/frontend-ui/SKILL.md", kind: "agent", title: "frontend-ui" },
  { path: ".agents/checklists/frontend-ui.md", kind: "checklist", title: "Frontend UI Checklist" },
  { path: ".agents/checklists/accessibility.md", kind: "checklist", title: "Accessibility Checklist" },
  { path: ".agents/validations/frontend-ui.md", kind: "validation", title: "Frontend UI Validation" },
];

export function templateFilesFor(scope: Scope, runner: Runner): readonly TemplateFile[] {
  const scopedFiles = [
    ...commonFiles,
    ...(scope === "backend" || scope === "fullstack" ? backendFiles : []),
    ...(scope === "frontend" || scope === "fullstack" ? frontendFilesFor(scope) : []),
  ];

  return [
    ...scopedFiles.map((file) => renderFile(file, scope)),
    ...runnerFiles(runner),
  ];
}

function frontendFilesFor(scope: Scope): readonly FileSpec[] {
  if (scope !== "fullstack") {
    return frontendFiles;
  }
  return frontendFiles.filter((file) => !file.path.startsWith("contracts/backend-api/"));
}

function renderFile(file: FileSpec, scope: Scope): TemplateFile {
  if (file.path === ".editorconfig") {
    return { ...file, content: editorconfig() };
  }
  if (file.path === ".gitattributes") {
    return { ...file, content: gitattributes() };
  }
  if (file.path === ".gitignore") {
    return { ...file, content: gitignoreBlock(), merge: "gitignore" };
  }
  if (file.path === "AGENTS.md") {
    return { ...file, content: rootAgents(scope) };
  }
  if (file.path === "README.md") {
    return { ...file, content: rootReadme(scope) };
  }
  if (file.path === "VALIDATION.md") {
    return { ...file, content: validationDoc("Validation", scope) };
  }
  if (file.path === "CHECKLIST.md") {
    return { ...file, content: checklistRouter(scope) };
  }
  if (file.path === "docs/README.md") {
    return { ...file, content: docsReadme(scope) };
  }
  if (file.path === ".agents/context-map.md") {
    return { ...file, content: contextMap(scope) };
  }
  if (file.path.endsWith("/SKILL.md")) {
    const name = file.title ?? "agent-skill";
    return { ...file, content: agentSkill(name) };
  }
  if (file.path.includes("/checklists/")) {
    return { ...file, content: checklistDoc(file.title ?? file.path) };
  }
  if (file.path.includes("/validations/")) {
    return { ...file, content: validationDoc(file.title ?? file.path, scope) };
  }
  if (file.path === "api/openapi.yaml" || file.path === "contracts/backend-api/openapi.yaml") {
    return { ...file, content: openApiSkeleton() };
  }
  if (file.path.endsWith("success-response.json")) {
    return { ...file, content: `${JSON.stringify({ data: { id: "resource_UNDECIDED", type: "Resource" } }, null, 2)}\n` };
  }
  if (file.path.endsWith("error-response.json")) {
    const errorResponse = {
      error: {
        code: "UNDECIDED_ERROR",
        message: "A safe public error message.",
        requestId: "req_UNDECIDED",
      },
    };
    return { ...file, content: `${JSON.stringify(errorResponse, null, 2)}\n` };
  }
  if (file.path.endsWith("paginated-response.json")) {
    return { ...file, content: `${JSON.stringify({ data: [], page: { limit: 25, nextCursor: null } }, null, 2)}\n` };
  }
  if (file.path === "db/schema.dbml") {
    return { ...file, content: dbml() };
  }
  if (file.path === "docs/frontend/FRONTEND_DESIGN.md") {
    return { ...file, content: frontendDesignDoc() };
  }
  if (file.path.startsWith("docs/backend/")) {
    return { ...file, content: backendDoc(file.title ?? file.path) };
  }
  if (file.path.startsWith("docs/engineering/")) {
    return { ...file, content: engineeringDoc(file.title ?? file.path) };
  }
  if (file.path.startsWith("docs/ops/")) {
    return { ...file, content: opsDoc(file.title ?? file.path) };
  }
  if (file.path.startsWith("docs/architecture/") || file.path === "ARCHITECTURE.md") {
    return { ...file, content: architectureDoc(file.title ?? file.path) };
  }
  if (file.path.endsWith(".mmd")) {
    return { ...file, content: mermaid(file.title ?? "diagram") };
  }
  if (file.path === ".github/PULL_REQUEST_TEMPLATE.md") {
    return { ...file, content: pullRequestTemplate() };
  }
  if (file.path === ".github/CODEOWNERS") {
    return { ...file, content: "# Replace @REPLACE_WITH_OWNER with your GitHub user or team before enabling CODEOWNERS.\n# * @REPLACE_WITH_OWNER\n" };
  }
  if (file.path.startsWith(".github/ISSUE_TEMPLATE/")) {
    return { ...file, content: githubIssueTemplate(file.title ?? "Issue") };
  }
  return { ...file, content: markdownDoc(file.title ?? file.path) };
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

function checklistRouter(scope: Scope): string {
  const scopedRoutes = [
    ...(scope === "backend" || scope === "fullstack"
      ? ["- Backend API changes: .agents/checklists/backend-api.md", "- DB migration changes: .agents/checklists/db-migration.md"]
      : []),
    ...(scope === "frontend" || scope === "fullstack"
      ? ["- Frontend UI changes: .agents/checklists/frontend-ui.md", "- Accessibility changes: .agents/checklists/accessibility.md"]
      : []),
  ];

  return `# Checklist Router

Status: Draft

Use this file as a router. Do not turn it into one giant checklist.

- Feature work: .agents/checklists/security.md, .agents/checklists/performance.md
- Bug fixes: .agents/checklists/security.md when data or access is touched
- Ops changes: .agents/checklists/ops-change.md
- Dependency changes: .agents/checklists/dependency.md
- Repository hygiene changes: .agents/checklists/security.md and .agents/checklists/ops-change.md
${scopedRoutes.join("\n")}
`;
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
