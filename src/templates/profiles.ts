import type { Addon, Density, FileKind, Profile, Scope, TemplateFile } from "../core/types.js";
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

const webAppFiles = profileGroup("web-app", "Web App", "docs/web-app", [
  ["routing-and-rendering.md", "Routing and Rendering", ["minimal", "standard", "strict"]],
  ["browser-state.md", "Browser State", ["standard", "strict"]],
  ["frontend-observability.md", "Frontend Observability", ["strict"]],
]);

const mobileAppFiles = profileGroup("mobile-app", "Mobile App", "docs/mobile-app", [
  ["app-lifecycle.md", "App Lifecycle", ["minimal", "standard", "strict"]],
  ["offline-and-sync.md", "Offline and Sync", ["standard", "strict"]],
  ["store-release.md", "Store Release", ["strict"]],
]);

const sdkFiles = profileGroup("sdk", "SDK", "docs/sdk", [
  ["public-api.md", "SDK Public API", ["minimal", "standard", "strict"]],
  ["compatibility.md", "SDK Compatibility", ["standard", "strict"]],
  ["examples-and-samples.md", "Examples and Samples", ["strict"]],
]);

const workerServiceFiles = profileGroup("worker-service", "Worker Service", "docs/worker-service", [
  ["job-contract.md", "Job Contract", ["minimal", "standard", "strict"]],
  ["retry-and-idempotency.md", "Retry and Idempotency", ["standard", "strict"]],
  ["queue-operations.md", "Queue Operations", ["strict"]],
]);

const infraModuleFiles = profileGroup("infra-module", "Infrastructure Module", "docs/infra-module", [
  ["module-interface.md", "Module Interface", ["minimal", "standard", "strict"]],
  ["environment-contract.md", "Environment Contract", ["standard", "strict"]],
  ["drift-policy.md", "Drift Policy", ["strict"]],
]);

const dataPipelineFiles = profileGroup("data-pipeline", "Data Pipeline", "docs/data-pipeline", [
  ["lineage.md", "Data Lineage", ["minimal", "standard", "strict"]],
  ["quality-gates.md", "Quality Gates", ["standard", "strict"]],
  ["retention-and-privacy.md", "Retention and Privacy", ["strict"]],
]);

const githubActionFiles = profileGroup("github-action", "GitHub Action", "docs/github-action", [
  ["action-contract.md", "Action Contract", ["minimal", "standard", "strict"]],
  ["inputs-and-outputs.md", "Inputs and Outputs", ["minimal", "standard", "strict"]],
  ["permissions.md", "Permissions", ["standard", "strict"]],
]);

const browserExtensionFiles = profileGroup("browser-extension", "Browser Extension", "docs/browser-extension", [
  ["extension-contract.md", "Extension Contract", ["minimal", "standard", "strict"]],
  ["permissions.md", "Permissions", ["standard", "strict"]],
  ["content-script-boundaries.md", "Content Script Boundaries", ["strict"]],
]);

const pluginFiles = profileGroup("plugin", "Plugin", "docs/plugin", [
  ["host-contract.md", "Host Contract", ["minimal", "standard", "strict"]],
  ["extension-points.md", "Extension Points", ["standard", "strict"]],
  ["compatibility.md", "Plugin Compatibility", ["strict"]],
]);

const docsSiteFiles = profileGroup("docs-site", "Docs Site", "docs/docs-site", [
  ["information-architecture.md", "Information Architecture", ["minimal", "standard", "strict"]],
  ["publishing.md", "Publishing", ["standard", "strict"]],
  ["content-quality.md", "Content Quality", ["strict"]],
]);

const monorepoFiles = profileGroup("monorepo", "Monorepo", "docs/monorepo", [
  ["workspace-boundaries.md", "Workspace Boundaries", ["minimal", "standard", "strict"]],
  ["package-ownership.md", "Package Ownership", ["standard", "strict"]],
  ["change-coordination.md", "Change Coordination", ["strict"]],
]);

export function profileFilesFor(profile: Profile, scope: Scope, density: Density, addons: readonly Addon[] = []): readonly TemplateFile[] {
  const rendered = profileList(profile, addons).flatMap((repoType) =>
    profileFileSpecs(repoType, scope).filter((file) => includesDensity(file, density)).map((file) => renderProfileFile(file, repoType, scope)),
  );
  return dedupeTemplateFiles(rendered);
}

function profileList(profile: Profile, addons: readonly Addon[]): readonly Addon[] {
  return [profile, ...addons].filter((value): value is Addon => value !== "generic");
}

function profileFileSpecs(profile: Addon, scope: Scope): readonly ProfileFileSpec[] {
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
  if (profile === "web-app") {
    return webAppFiles;
  }
  if (profile === "mobile-app") {
    return mobileAppFiles;
  }
  if (profile === "sdk") {
    return sdkFiles;
  }
  if (profile === "worker-service") {
    return workerServiceFiles;
  }
  if (profile === "infra-module") {
    return infraModuleFiles;
  }
  if (profile === "data-pipeline") {
    return dataPipelineFiles;
  }
  if (profile === "github-action") {
    return githubActionFiles;
  }
  if (profile === "browser-extension") {
    return browserExtensionFiles;
  }
  if (profile === "plugin") {
    return pluginFiles;
  }
  if (profile === "docs-site") {
    return docsSiteFiles;
  }
  return monorepoFiles;
}

function renderProfileFile(file: ProfileFileSpec, profile: Addon, scope: Scope): TemplateFile {
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

function profileGroup(profile: Addon, title: string, dir: string, docs: ReadonlyArray<readonly [string, string, readonly Density[]]>): readonly ProfileFileSpec[] {
  const checklistSlug = profile === "library" ? "library-package" : profile;
  return [
    { path: `${dir}/README.md`, kind: "document", title, renderer: "profile-doc", density: ["minimal", "standard", "strict"] },
    ...docs.map(
      ([filename, docTitle, density]): ProfileFileSpec => ({
        path: `${dir}/${filename}`,
        kind: "document",
        title: docTitle,
        renderer: "profile-doc",
        density,
      }),
    ),
    { path: `.agents/skills/${checklistSlug}/SKILL.md`, kind: "agent", title: checklistSlug, renderer: "agent-skill", density: ["minimal", "standard", "strict"] },
    { path: `.agents/checklists/${checklistSlug}.md`, kind: "checklist", title: `${title} Checklist`, renderer: "checklist", density: ["minimal", "standard", "strict"] },
    { path: `.agents/validations/${checklistSlug}.md`, kind: "validation", title: `${title} Validation`, renderer: "validation", density: ["standard", "strict"] },
  ];
}

function dedupeTemplateFiles(files: readonly TemplateFile[]): readonly TemplateFile[] {
  const seen = new Set<string>();
  const deduped: TemplateFile[] = [];
  for (const file of files) {
    if (!seen.has(file.path)) {
      seen.add(file.path);
      deduped.push(file);
    }
  }
  return deduped;
}
