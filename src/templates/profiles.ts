import type { Density, FileKind, Profile, Scope, TemplateFile } from "../core/types.js";
import { agentSkill, checklistDoc, openApiSkeleton, profileDoc, validationDoc } from "./documents.js";

interface ProfileFileSpec {
  readonly path: string;
  readonly kind: FileKind;
  readonly title: string;
  readonly renderer: ProfileRenderer;
  readonly density?: readonly Density[];
}

type ProfileRenderer = "profile-doc" | "agent-skill" | "checklist" | "validation" | "openapi" | "success-json" | "error-json" | "paginated-json";

const cliToolFiles: readonly ProfileFileSpec[] = [
  { path: "docs/cli/README.md", kind: "document", title: "CLI Tool", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/cli/command-contract.md", kind: "document", title: "Command Contract", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/cli/configuration.md", kind: "document", title: "CLI Configuration", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/cli/output-and-exit-codes.md", kind: "document", title: "Output and Exit Codes", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/cli/shell-completion.md", kind: "document", title: "Shell Completion", renderer: "profile-doc", density: ["strict"] },
  { path: ".agents/skills/cli-tool/SKILL.md", kind: "agent", title: "cli-tool", renderer: "agent-skill", density: ["minimal", "standard", "strict"] },
  { path: ".agents/checklists/cli-tool.md", kind: "checklist", title: "CLI Tool Checklist", renderer: "checklist", density: ["minimal", "standard", "strict"] },
  { path: ".agents/validations/cli-tool.md", kind: "validation", title: "CLI Tool Validation", renderer: "validation", density: ["standard", "strict"] },
];

const apiServiceFiles: readonly ProfileFileSpec[] = [
  { path: "docs/api-service/README.md", kind: "document", title: "API Service", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/api-service/api-lifecycle.md", kind: "document", title: "API Lifecycle", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/api-service/idempotency.md", kind: "document", title: "Idempotency", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/api-service/rate-limits.md", kind: "document", title: "Rate Limits", renderer: "profile-doc", density: ["strict"] },
  { path: "docs/api-service/slo.md", kind: "document", title: "Service SLO", renderer: "profile-doc", density: ["strict"] },
  { path: ".agents/skills/api-service/SKILL.md", kind: "agent", title: "api-service", renderer: "agent-skill", density: ["minimal", "standard", "strict"] },
  { path: ".agents/checklists/api-service.md", kind: "checklist", title: "API Service Checklist", renderer: "checklist", density: ["minimal", "standard", "strict"] },
  { path: ".agents/validations/api-service.md", kind: "validation", title: "API Service Validation", renderer: "validation", density: ["standard", "strict"] },
];

const apiServiceContractFiles: readonly ProfileFileSpec[] = [
  { path: "api/openapi.yaml", kind: "contract", title: "OpenAPI", renderer: "openapi", density: ["minimal", "standard", "strict"] },
  { path: "api/examples/success-response.json", kind: "contract", title: "Success Response", renderer: "success-json", density: ["standard", "strict"] },
  { path: "api/examples/error-response.json", kind: "contract", title: "Error Response", renderer: "error-json", density: ["standard", "strict"] },
  { path: "api/examples/paginated-response.json", kind: "contract", title: "Paginated Response", renderer: "paginated-json", density: ["standard", "strict"] },
];

const desktopAppFiles: readonly ProfileFileSpec[] = [
  { path: "docs/desktop/README.md", kind: "document", title: "Desktop App", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/desktop/installers.md", kind: "document", title: "Installers", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/desktop/auto-update.md", kind: "document", title: "Auto Update", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/desktop/crash-reporting.md", kind: "document", title: "Crash Reporting", renderer: "profile-doc", density: ["strict"] },
  { path: "docs/desktop/local-data.md", kind: "document", title: "Local Data", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/desktop/os-support.md", kind: "document", title: "OS Support", renderer: "profile-doc", density: ["strict"] },
  { path: "docs/security/desktop-security.md", kind: "document", title: "Desktop Security", renderer: "profile-doc", density: ["strict"] },
  { path: ".agents/skills/desktop-app/SKILL.md", kind: "agent", title: "desktop-app", renderer: "agent-skill", density: ["minimal", "standard", "strict"] },
  { path: ".agents/checklists/desktop-app.md", kind: "checklist", title: "Desktop App Checklist", renderer: "checklist", density: ["minimal", "standard", "strict"] },
  { path: ".agents/validations/desktop-app.md", kind: "validation", title: "Desktop App Validation", renderer: "validation", density: ["standard", "strict"] },
];

const libraryFiles: readonly ProfileFileSpec[] = [
  { path: "docs/library/README.md", kind: "document", title: "Library", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/library/public-api.md", kind: "document", title: "Public API", renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
  { path: "docs/library/semver.md", kind: "document", title: "Semantic Versioning", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/library/compatibility.md", kind: "document", title: "Compatibility", renderer: "profile-doc", density: ["standard", "strict"] },
  { path: "docs/library/package-surface.md", kind: "document", title: "Package Surface", renderer: "profile-doc", density: ["strict"] },
  { path: "docs/library/migration-guide.md", kind: "document", title: "Migration Guide", renderer: "profile-doc", density: ["strict"] },
  { path: ".agents/skills/library-package/SKILL.md", kind: "agent", title: "library-package", renderer: "agent-skill", density: ["minimal", "standard", "strict"] },
  { path: ".agents/checklists/library-package.md", kind: "checklist", title: "Library Package Checklist", renderer: "checklist", density: ["minimal", "standard", "strict"] },
  { path: ".agents/validations/library-package.md", kind: "validation", title: "Library Package Validation", renderer: "validation", density: ["standard", "strict"] },
];

export function profileFilesFor(profile: Profile, scope: Scope, density: Density): readonly TemplateFile[] {
  return profileFileSpecs(profile, scope).filter((file) => includesDensity(file, density)).map((file) => renderProfileFile(file, profile, scope));
}

function profileFileSpecs(profile: Profile, scope: Scope): readonly ProfileFileSpec[] {
  if (profile === "cli-tool") {
    return cliToolFiles;
  }
  if (profile === "api-service") {
    const contractFiles = scope === "backend" || scope === "fullstack" ? [] : apiServiceContractFiles;
    return [...apiServiceFiles, ...contractFiles];
  }
  if (profile === "desktop-app") {
    return desktopAppFiles;
  }
  if (profile === "library") {
    return libraryFiles;
  }
  return [];
}

function renderProfileFile(file: ProfileFileSpec, profile: Profile, scope: Scope): TemplateFile {
  switch (file.renderer) {
    case "agent-skill":
      return { ...file, content: agentSkill(file.title) };
    case "checklist":
      return { ...file, content: checklistDoc(file.title) };
    case "validation":
      return { ...file, content: validationDoc(file.title, scope, profile) };
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
    case "profile-doc":
      return { ...file, content: profileDoc(file.title, profile) };
  }
}

function includesDensity(file: ProfileFileSpec, density: Density): boolean {
  return file.density?.includes(density) ?? density !== "minimal";
}
