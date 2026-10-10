import { describe, expect, it } from "vitest";
import path from "node:path";
import { templateFilesFor } from "../src/templates/index.js";
import { profileFilesFor } from "../src/templates/profiles.js";
import { addons, densities, scopes } from "../src/core/types.js";

describe("topic-specific generated documents", () => {
  it.each([
    { file: "00-project-invariants.md", minimum: "minimal", source: "docs/architecture/00-system-boundary.md", decisions: ["Invariant inventory", "Authority boundaries", "Effect completion"] },
    { file: "01-design-review-questions.md", minimum: "standard", source: "docs/engineering/00-project-invariants.md", decisions: ["Problem and alternatives", "Ownership and contracts", "Failure and recovery"] },
    { file: "02-code-review-checklist.md", minimum: "standard", source: "docs/engineering/00-project-invariants.md", decisions: ["Observable change", "Effect correctness", "Evidence quality"] },
    { file: "03-performance-budget.md", minimum: "standard", source: "docs/architecture/03-quality-attributes.md", decisions: ["Representative workload", "Measurement contract", "Limits and tradeoffs"] },
    { file: "04-security-baseline.md", minimum: "standard", source: "docs/engineering/00-project-invariants.md", decisions: ["Protected operations", "Trust crossings", "Control evidence"] },
    { file: "05-testing-standard.md", minimum: "standard", source: "docs/engineering/00-project-invariants.md", decisions: ["Risk coverage", "Independent oracle", "Evidence cost"] },
    { file: "06-dependency-and-change-policy.md", minimum: "standard", source: "docs/engineering/00-project-invariants.md", decisions: ["Necessity and alternatives", "Compatibility updates", "Replacement and exit"] },
    { file: "07-operability-and-failure-standard.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Failure state", "Completion reporting", "Recovery ownership"] },
    { file: "08-threat-model.md", minimum: "strict", source: "docs/engineering/00-project-invariants.md", decisions: ["Assets", "Trust boundaries", "Attacker capabilities"] },
    { file: "09-data-integrity.md", minimum: "strict", source: "docs/engineering/00-project-invariants.md", decisions: ["Invariants", "Transaction boundaries", "Reconciliation"] },
  ] as const)("provides engineering decisions and a valid source for $file", ({ file, minimum, source, decisions }) => {
    for (const scope of scopes) for (const density of densities) {
      const files = templateFilesFor(scope, "none", "generic", density);
      const content = files.find((candidate) => candidate.path === `docs/engineering/${file}`)?.content;
      if (densities.indexOf(density) < densities.indexOf(minimum)) { expect(content).toBeUndefined(); continue; }
      for (const decision of decisions) expect(content).toContain(`${decision}: UNDECIDED`);
      expect(content).toContain(`Project-wide decisions: ${source}`);
      expect(files.some((candidate) => candidate.path === source)).toBe(true);
      expect(content).toContain("- Required evidence and remaining gaps: UNDECIDED");
    }
  });

  it.each([
    { file: "00-operational-contract.md", minimum: "minimal", source: "docs/product/02-spec.md", decisions: ["Critical journeys", "Operating ownership", "Recovery budgets"] },
    { file: "observability.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Diagnosis questions", "Signal interpretation", "Actionable response"] },
    { file: "ci.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Verification scope", "Evidence identity", "Cost and duplication"] },
    { file: "release.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Release unit", "Promotion evidence", "Partial release recovery"] },
    { file: "rollback.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Observed state", "Recovery eligibility", "Restoration evidence"] },
    { file: "config-and-env.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Configuration inventory", "Source precedence", "Activation and drift"] },
    { file: "secrets.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Secret inventory", "Access boundary", "Rotation and revocation"] },
    { file: "backup-and-restore.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["Protected state", "Restore prerequisites", "Restore evidence"] },
    { file: "incident-response.md", minimum: "standard", source: "docs/ops/00-operational-contract.md", decisions: ["User impact and severity", "Containment decisions", "Recovery confirmation"] },
    { file: "disaster-recovery.md", minimum: "strict", source: "docs/ops/00-operational-contract.md", decisions: ["RTO", "RPO", "Restore exercise"] },
    { file: "service-levels.md", minimum: "strict", source: "docs/ops/00-operational-contract.md", decisions: ["SLI", "Measurement window", "Error budget"] },
  ] as const)("provides actionable operations decisions for $file at its supported densities", ({ file, minimum, source, decisions }) => {
    for (const scope of scopes) for (const density of densities) {
      const files = templateFilesFor(scope, "none", "generic", density);
      const content = files.find((candidate) => candidate.path === `docs/ops/${file}`)?.content;
      if (densities.indexOf(density) < densities.indexOf(minimum)) { expect(content).toBeUndefined(); continue; }
      for (const decision of decisions) expect(content).toContain(`${decision}: UNDECIDED`);
      expect(content).toContain(`Project-wide decisions: ${source}`);
      expect(files.some((candidate) => candidate.path === source)).toBe(true);
      expect(content).toContain("- Owner: UNASSIGNED");
      expect(content).toContain("- Required evidence and remaining gaps: UNDECIDED");
    }
  });

  it.each([
    { file: "contracts/backend-api/README.md", scope: "frontend", minimum: "standard", source: "docs/integrations/backend-api.md", decisions: ["Contract provenance", "Copy ownership", "Compatibility evidence"] },
    { file: "docs/frontend/accessibility.md", scope: "frontend", minimum: "strict", source: "docs/frontend/FRONTEND_DESIGN.md", decisions: ["Semantic controls", "Keyboard and focus", "Evidence limits"] },
    { file: "docs/frontend/state-and-cache.md", scope: "fullstack", minimum: "strict", source: "docs/frontend/FRONTEND_DESIGN.md", decisions: ["State authority", "Response freshness", "Identity isolation"] },
  ] as const)("gives $file decisions matching its frontend responsibility", ({ file, scope, minimum, source, decisions }) => {
    for (const density of densities) {
      const files = templateFilesFor(scope, "none", "web-app", density);
      const content = files.find((candidate) => candidate.path === file)?.content;
      if (densities.indexOf(density) < densities.indexOf(minimum)) { expect(content).toBeUndefined(); continue; }
      for (const decision of decisions) expect(content).toContain(`${decision}: UNDECIDED`);
      expect(content).toContain(`Project-wide decisions: ${source}`);
      expect(files.some((candidate) => candidate.path === source)).toBe(true);
      expect(content).not.toContain("This document captures the durable design contract");
    }
  });

  it.each(["frontend", "fullstack"] as const)("uses the actual %s API authority without selecting a frontend architecture", (scope) => {
    for (const density of densities) {
      const files = templateFilesFor(scope, "none", "generic", density);
      const apiSource = scope === "fullstack" ? "api/openapi.yaml" : "contracts/backend-api/openapi.yaml";
      const integration = files.find((file) => file.path === "docs/integrations/backend-api.md")!.content;
      expect(integration).toContain(`Project-wide decisions: ${apiSource}`);
      for (const decision of ["Contract provenance", "Client mapping", "Unknown outcomes"]) expect(integration).toContain(`${decision}: UNDECIDED`);
      expect(files.some((file) => file.path === apiSource)).toBe(true);
      const design = files.find((file) => file.path === "docs/frontend/FRONTEND_DESIGN.md")!.content;
      expect(design).toContain(`API contract: ${apiSource}`);
      expect(design).toContain("Layer model: UNDECIDED");
      expect(design).toContain("Allowed shared state: UNDECIDED");
      expect(design).toContain("Excluded shared state: UNDECIDED");
      expect(design).not.toContain("app -> pages -> features -> entities -> shared");
      expect(design).not.toContain("- Server response copies.");
      if (scope === "fullstack") {
        expect(integration).not.toContain("contracts/backend-api/");
        expect(design).not.toContain("contracts/backend-api/");
        expect(files.some((file) => file.path === "contracts/backend-api/README.md")).toBe(false);
      }
    }
  });

  it.each([
    { file: "README.md", minimum: "minimal", source: "docs/architecture/00-system-boundary.md", decisions: ["Backend responsibilities", "Contract owners", "Decision map"] },
    { file: "00-api-server-boundary.md", minimum: "minimal", source: "docs/backend/README.md", decisions: ["Owned entrypoints", "External authority", "Effect completion"] },
    { file: "01-authentication.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Identity evidence", "Identity lifetime", "Verifier failure"] },
    { file: "02-authorization.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Principal and resource", "Decision enforcement", "Policy failure"] },
    { file: "03-persistence-model.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["State authority", "Identity and invariants", "Consistency boundary"] },
    { file: "04-http-api-policy.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Request grammar", "Side effects and retries", "Completion and timeout"] },
    { file: "05-error-response.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Public error shape", "Stable error codes", "Unknown outcomes"] },
    { file: "06-logging-and-observability.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Observation questions", "Correlation identity", "Sensitive fields"] },
    { file: "07-migration-strategy.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Before and after state", "Transition ordering", "Recovery eligibility"] },
    { file: "08-backend-security.md", minimum: "standard", source: "docs/backend/README.md", decisions: ["Protected assets", "Trust boundaries", "Abuse and exhaustion"] },
    { file: "09-api-evolution.md", minimum: "strict", source: "docs/backend/04-http-api-policy.md", decisions: ["Consumer inventory", "Compatibility definition", "Retirement evidence"] },
    { file: "10-data-integrity.md", minimum: "strict", source: "docs/backend/03-persistence-model.md", decisions: ["Invariant inventory", "Concurrent changes", "Reconciliation evidence"] },
  ] as const)("gives backend $file its own decisions while retaining scope and density", ({ file, minimum, source, decisions }) => {
    for (const scope of ["backend", "fullstack"] as const) for (const density of densities) {
      for (const profile of ["generic", "api-service"] as const) {
        const files = templateFilesFor(scope, "none", profile, density);
        const content = files.find((candidate) => candidate.path === `docs/backend/${file}`)?.content;
        if (densities.indexOf(density) < densities.indexOf(minimum)) { expect(content).toBeUndefined(); continue; }
        expect(content).toContain("- Status: Draft");
        for (const decision of decisions) expect(content).toContain(`${decision}: UNDECIDED`);
        expect(content).toContain(`Project-wide decisions: ${source}`);
        expect(files.some((candidate) => candidate.path === source)).toBe(true);
        expect(content).not.toContain("This backend document covers API server boundary");
      }
    }
    expect(templateFilesFor("frontend", "none", "api-service", "strict").some((candidate) => candidate.path === `docs/backend/${file}`)).toBe(false);
  });

  it("directs higher-density backend overviews to the separate error policy without self-references", () => {
    const files = templateFilesFor("backend", "none", "generic", "standard");
    for (const file of ["README.md", "00-api-server-boundary.md"]) {
      expect(files.find((candidate) => candidate.path === `docs/backend/${file}`)?.content).toContain("Error response policy: docs/backend/05-error-response.md");
    }
    expect(files.find((candidate) => candidate.path === "docs/backend/05-error-response.md")?.content).not.toContain("docs/backend/05-error-response.md");
  });

  it.each([
    { file: "0000-template.md", prompts: ["Problem and evidence", "Chosen option", "Do nothing", "Revisit trigger"] },
    { file: "0001-initial-architecture-boundaries.md", prompts: ["Owned responsibilities", "External authority", "Trust crossings", "Failure containment"] },
    { file: "0002-contract-source-of-truth.md", prompts: ["Contract inventory", "Canonical authority", "Derived consumers", "Drift detection"] },
  ])("provides a draft decision record for $file without changing density or references", ({ file, prompts }) => {
    for (const scope of scopes) for (const density of densities) {
      const files = templateFilesFor(scope, "none", "cli-tool", density);
      const document = files.find((candidate) => candidate.path === `docs/adr/${file}`);
      if (density === "minimal") { expect(document).toBeUndefined(); continue; }
      expect(document?.content).toContain("- Status: Draft\n- Owner: UNASSIGNED\n- Decision date: UNDECIDED");
      for (const section of ["Context", "Decision", "Alternatives", "Consequences", "Verification", "Lifecycle"]) {
        expect(document?.content).toContain(`## ${section}\n`);
      }
      for (const prompt of prompts) expect(document?.content).toContain(`${prompt}: UNDECIDED`);
      expect(document?.content).toContain("Superseded");
      expect(document?.content).not.toContain("This document captures the durable design contract");
      for (const reference of document!.content.matchAll(/\]\(([^)]+\.md)\)/gu)) {
        const target = path.posix.normalize(path.posix.join("docs/adr", reference[1]!));
        expect(files.some((candidate) => candidate.path === target), `${file} references missing ${target}`).toBe(true);
      }
    }
  });

  it("indexes the seeded ADRs as drafts and explains recording and superseding decisions", () => {
    const files = templateFilesFor("general", "none", "generic", "standard");
    const content = files.find((file) => file.path === "docs/adr/README.md")!.content;
    expect(content).toContain("not accepted architecture decisions");
    expect(content).toContain("[ADR template](0000-template.md)");
    expect(content).toMatch(/\[Initial Architecture Boundaries\]\(0001-initial-architecture-boundaries\.md\) \| Draft/u);
    expect(content).toMatch(/\[Contract Source of Truth\]\(0002-contract-source-of-truth\.md\) \| Draft/u);
    expect(content).toContain("Acceptance does not prove implementation");
    expect(content).toContain("preserve the previous rationale");
    expect(content).toContain("update this index");
  });

  it.each([
    { path: "docs/product/00-product-brief.md", minimum: "minimal", source: "README.md", decisions: ["User outcome", "Target users", "Scope and exclusions"] },
    { path: "docs/product/01-roadmap.md", minimum: "standard", source: "docs/product/02-spec.md", decisions: ["Milestone outcomes", "Dependency ordering", "Stop or revise"] },
    { path: "docs/product/02-spec.md", minimum: "minimal", source: "docs/product/00-product-brief.md", decisions: ["Observable behavior", "Acceptance criteria", "Failure and recovery"] },
    { path: "docs/product/03-risk-register.md", minimum: "standard", source: "docs/product/00-product-brief.md", decisions: ["Risk scenario", "Impact and likelihood", "Mitigation owner"] },
    { path: "docs/architecture/00-system-boundary.md", minimum: "minimal", source: "docs/product/00-product-brief.md", decisions: ["Owned responsibilities", "External authority", "Trust crossings"] },
    { path: "docs/architecture/01-domain-model.md", minimum: "standard", source: "docs/architecture/00-system-boundary.md", decisions: ["Domain vocabulary", "Identity and lifecycle", "Invariants"] },
    { path: "docs/architecture/02-runtime-flow.md", minimum: "standard", source: "docs/architecture/00-system-boundary.md", decisions: ["Entry and completion", "Effect ordering", "Interruption and retry"] },
    { path: "docs/architecture/03-quality-attributes.md", minimum: "standard", source: "docs/product/02-spec.md", decisions: ["Quality scenarios", "Measurement contract", "Thresholds and tradeoffs"] },
    { path: "ARCHITECTURE.md", minimum: "standard", source: "docs/architecture/00-system-boundary.md", decisions: ["Architecture map", "Decision status", "Change impact"] },
  ] as const)("gives common $path its own product or architecture decisions", ({ path, minimum, source, decisions }) => {
    for (const scope of scopes) for (const density of densities) {
      const files = templateFilesFor(scope, "none", "generic", density);
      const document = files.find((candidate) => candidate.path === path);
      if (densities.indexOf(density) < densities.indexOf(minimum)) { expect(document).toBeUndefined(); continue; }
      expect(document?.content).toContain("## Contract");
      for (const decision of decisions) expect(document?.content).toContain(`${decision}: UNDECIDED`);
      expect(document?.content).toContain(`Project-wide decisions: ${source}`);
      expect(files.some((candidate) => candidate.path === source)).toBe(true);
      expect(document?.content).not.toContain("This document captures the durable design contract");
    }
  });

  it.each([
    { scope: "mobile", file: "app-contract.md", minimum: "minimal", decisions: ["Surface boundary", "User work and state", "External contracts"] },
    { scope: "mobile", file: "platform-support.md", minimum: "standard", decisions: ["Support matrix", "Capability differences", "End of support"] },
    { scope: "mobile", file: "offline-and-sync.md", minimum: "standard", decisions: ["Offline authority", "Conflict resolution", "Replay and deletion"] },
    { scope: "mobile", file: "store-release.md", minimum: "strict", decisions: ["Artifact identity", "Rollout and monitoring", "Release recovery"] },
    { scope: "infra", file: "module-contract.md", minimum: "minimal", decisions: ["Module boundary", "Inputs and outputs", "State authority"] },
    { scope: "infra", file: "environments.md", minimum: "standard", decisions: ["Environment isolation", "Credential authority", "Recovery and teardown"] },
    { scope: "infra", file: "change-plan.md", minimum: "standard", decisions: ["Reviewed change", "Apply authority", "Stop conditions"] },
    { scope: "infra", file: "drift-and-rollback.md", minimum: "strict", decisions: ["Drift inventory", "Recovery eligibility", "Rollback evidence"] },
    { scope: "data", file: "pipeline-contract.md", minimum: "minimal", decisions: ["Input and output contracts", "Delivery semantics", "Consumer acceptance"] },
    { scope: "data", file: "lineage.md", minimum: "standard", decisions: ["Dataset grain", "Transformation lineage", "Late data and backfills"] },
    { scope: "data", file: "quality.md", minimum: "standard", decisions: ["Quality dimensions", "Gate enforcement", "Quarantine and recovery"] },
    { scope: "data", file: "privacy-and-retention.md", minimum: "strict", decisions: ["Retention clocks", "Deletion propagation", "Backup and replay behavior"] },
  ] as const)("gives $scope/$file decisions appropriate to its scope at every supported density", ({ scope, file, minimum, decisions }) => {
    for (const density of densities) {
      for (const profile of ["generic", "cli-tool"] as const) {
        const files = templateFilesFor(scope, "none", profile, density);
        const document = files.find((candidate) => candidate.path === `docs/${scope}/${file}`);
        const available = densities.indexOf(density) >= densities.indexOf(minimum);
        if (!available) { expect(document).toBeUndefined(); continue; }
        expect(document?.content).toContain("## Contract");
        expect(document?.content).not.toContain("This document captures the durable design contract");
        for (const decision of decisions) expect(document?.content).toContain(`${decision}: UNDECIDED`);
        const references = [...(document?.content ?? "").matchAll(/Project-wide decisions: (\S+)/gu)];
        expect(references).toHaveLength(1);
        expect(references[0]?.[1]).toBe(`docs/${scope}/README.md`);
        expect(files.some((candidate) => candidate.path === references[0]?.[1])).toBe(true);
      }
    }
  });

  it.each([
    { profile: "docs-site", path: "information-architecture.md", decisions: ["Reader journeys", "Canonical content", "Navigation and discovery"] },
    { profile: "docs-site", path: "publishing.md", decisions: ["Publication authority", "Preview isolation", "Promotion and rollback"] },
    { profile: "docs-site", path: "content-quality.md", decisions: ["Accuracy and freshness", "Executable examples", "Accessibility and localization"] },
    { profile: "monorepo", path: "workspace-boundaries.md", decisions: ["Workspace inventory", "Dependency direction", "Shared infrastructure"] },
    { profile: "monorepo", path: "package-ownership.md", decisions: ["Package authority", "Public surface", "Ownership handoff"] },
    { profile: "monorepo", path: "change-coordination.md", decisions: ["Impact analysis", "Release ordering", "Partial rollout recovery"] },
  ] as const)("gives $profile $path specific publishing and coordination decisions", ({ profile, path, decisions }) => {
    for (const files of [templateFilesFor("general", "none", profile, "strict"), templateFilesFor("frontend", "none", "generic", "strict", [profile])]) {
      const content = files.find((file) => file.path === `docs/${profile}/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain(`docs/${profile}/README.md`);
      expect(content).toContain(`- Repository Type: ${profile}`);
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each(addons)("keeps %s topic bodies distinct and references available at every density", (profile) => {
    for (const density of densities) {
      const documents = profileFilesFor(profile, "general", density).filter((file) => file.kind === "document" && !file.path.endsWith("/README.md"));
      expect(documents.length).toBeGreaterThan(0);
      for (const files of [templateFilesFor("general", "none", profile, density), templateFilesFor("general", "none", "generic", density, [profile])]) {
        const paths = new Set(files.map((file) => file.path));
        const bodies: string[] = [];
        for (const document of documents) {
          const content = files.find((file) => file.path === document.path)?.content;
          expect(content, document.path).toBeDefined();
          expect(content, document.path).toContain("## Contract");
          expect(content, document.path).not.toContain("## Repository Type Contract");
          expect(content, document.path).toContain(`- Repository Type: ${profile}`);
          const references = [...(content ?? "").matchAll(/Project-wide decisions: (\S+)/gu)];
          expect(references, document.path).toHaveLength(1);
          expect(paths.has(references[0]?.[1] ?? ""), document.path).toBe(true);
          bodies.push((content ?? "").slice((content ?? "").indexOf("\n")));
        }
        expect(new Set(bodies).size).toBe(documents.length);
      }
    }
  });

  it.each([
    { profile: "github-action", path: "action-contract.md", decisions: ["Execution boundary", "Untrusted contributions", "Failure and cleanup"] },
    { profile: "github-action", path: "inputs-and-outputs.md", decisions: ["Input schema", "Output contract", "Secret handling"] },
    { profile: "github-action", path: "permissions.md", decisions: ["Permission inventory", "Credential scope", "Untrusted execution"] },
    { profile: "browser-extension", path: "extension-contract.md", decisions: ["Execution contexts", "Lifecycle and storage", "Distribution and updates"] },
    { profile: "browser-extension", path: "permissions.md", decisions: ["Capability inventory", "Grant and revocation", "Origin scope"] },
    { profile: "browser-extension", path: "content-script-boundaries.md", decisions: ["Injection boundary", "Message validation", "Page-controlled data"] },
    { profile: "plugin", path: "host-contract.md", decisions: ["Host capabilities", "Activation and teardown", "Failure isolation"] },
    { profile: "plugin", path: "extension-points.md", decisions: ["Registration ownership", "Invocation contract", "Reentrancy and concurrency"] },
    { profile: "plugin", path: "compatibility.md", decisions: ["Compatibility matrix", "Capability negotiation", "Migration and rollback"] },
  ] as const)("gives $profile $path specific host integration decisions", ({ profile, path, decisions }) => {
    for (const files of [templateFilesFor("general", "none", profile, "strict"), templateFilesFor("frontend", "none", "generic", "strict", [profile])]) {
      const content = files.find((file) => file.path === `docs/${profile}/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain(`docs/${profile}/README.md`);
      expect(content).toContain(`- Repository Type: ${profile}`);
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each([
    { profile: "web-app", path: "routing-and-rendering.md", decisions: ["Route ownership", "Rendering boundary", "Navigation failures"] },
    { profile: "web-app", path: "browser-state.md", decisions: ["State authority", "Persistence and expiry", "Multiple tabs"] },
    { profile: "web-app", path: "frontend-observability.md", decisions: ["User journey signals", "Error correlation", "Collection boundaries"] },
    { profile: "mobile-app", path: "app-lifecycle.md", decisions: ["Lifecycle states", "Background work", "Permission changes"] },
    { profile: "mobile-app", path: "offline-and-sync.md", decisions: ["Offline authority", "Conflict resolution", "Replay and deletion"] },
    { profile: "mobile-app", path: "store-release.md", decisions: ["Artifact identity", "Review and promotion", "Release recovery"] },
  ] as const)("gives $profile $path specific client lifecycle decisions", ({ profile, path, decisions }) => {
    for (const files of [templateFilesFor("general", "none", profile, "strict"), templateFilesFor("frontend", "none", "generic", "strict", [profile])]) {
      const content = files.find((file) => file.path === `docs/${profile}/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain(`docs/${profile}/README.md`);
      expect(content).toContain(`- Repository Type: ${profile}`);
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each([
    { profile: "worker-service", path: "job-contract.md", decisions: ["Job envelope", "Delivery and acknowledgment", "Completion and side effects"] },
    { profile: "worker-service", path: "retry-and-idempotency.md", decisions: ["Retryable failures", "Deduplication scope", "Replay and recovery"] },
    { profile: "worker-service", path: "queue-operations.md", decisions: ["Backlog signals", "Poison jobs", "Shutdown and draining"] },
    { profile: "infra-module", path: "module-interface.md", decisions: ["Module boundary", "Inputs and outputs", "State authority"] },
    { profile: "infra-module", path: "environment-contract.md", decisions: ["Environment isolation", "Promotion and configuration", "Credential authority"] },
    { profile: "infra-module", path: "drift-policy.md", decisions: ["Drift authority", "Detection and classification", "Emergency changes"] },
    { profile: "data-pipeline", path: "lineage.md", decisions: ["Source authority", "Dataset grain", "Late data and backfills"] },
    { profile: "data-pipeline", path: "quality-gates.md", decisions: ["Quality dimensions", "Gate enforcement", "Quarantine and recovery"] },
    { profile: "data-pipeline", path: "retention-and-privacy.md", decisions: ["Data classification", "Retention clocks", "Deletion propagation"] },
  ] as const)("gives $profile $path actionable operational decisions", ({ profile, path, decisions }) => {
    for (const files of [
      templateFilesFor("general", "none", profile, "strict"),
      templateFilesFor("backend", "none", "generic", "strict", [profile]),
    ]) {
      const content = files.find((file) => file.path === `docs/${profile}/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain(`docs/${profile}/README.md`);
      expect(content).toContain(`- Repository Type: ${profile}`);
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each([
    { profile: "library", path: "public-api.md", decisions: ["Supported entry points", "Inputs and defaults", "Ownership and lifecycle"] },
    { profile: "library", path: "semver.md", decisions: ["Compatibility promise", "Change classification", "Deprecation and removal"] },
    { profile: "library", path: "compatibility.md", decisions: ["Consumer matrix", "Dependency constraints", "Compatibility evidence"] },
    { profile: "library", path: "package-surface.md", decisions: ["Published contents", "Entry-point metadata", "Artifact validation"] },
    { profile: "library", path: "migration-guide.md", decisions: ["Before and after usage", "Migration ordering", "Completion evidence"] },
    { profile: "sdk", path: "public-api.md", decisions: ["Initialization and configuration", "Operation mapping", "Errors and cancellation"] },
    { profile: "sdk", path: "compatibility.md", decisions: ["Supported environments", "Upstream interface versions", "Unknown capabilities and fields"] },
    { profile: "sdk", path: "examples-and-samples.md", decisions: ["Scenario inventory", "Public import rules", "Example synchronization"] },
  ] as const)("gives $profile $path its own consumer decisions", ({ profile, path, decisions }) => {
    for (const files of [
      templateFilesFor("general", "none", profile, "strict"),
      templateFilesFor("frontend", "none", "generic", "strict", [profile]),
    ]) {
      const content = files.find((file) => file.path === `docs/${profile}/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain(`docs/${profile}/README.md`);
      expect(content).toContain(`- Repository Type: ${profile}`);
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each([
    { path: "docs/desktop/installers.md", decisions: ["Distribution matrix", "Privileges and paths", "Uninstall and cleanup"] },
    { path: "docs/desktop/auto-update.md", decisions: ["Update lifecycle", "Metadata and artifact trust", "Recovery and rollback"] },
    { path: "docs/desktop/crash-reporting.md", decisions: ["Privacy and consent", "Symbolication", "Triage ownership"] },
    { path: "docs/desktop/local-data.md", decisions: ["Storage inventory", "Data schemas and migrations", "Corruption handling"] },
    { path: "docs/desktop/os-support.md", decisions: ["Support matrix", "Unsupported environments", "Filesystem behavior"] },
    { path: "docs/security/desktop-security.md", decisions: ["Privilege boundaries", "IPC and external entry points", "Untrusted content"] },
  ])("gives desktop $path its own decisions for primary and addon use", ({ path, decisions }) => {
    for (const files of [
      templateFilesFor("general", "none", "desktop-app", "strict"),
      templateFilesFor("frontend", "none", "generic", "strict", ["desktop-app"]),
    ]) {
      const content = files.find((file) => file.path === path)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain("docs/desktop/README.md");
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each([
    { path: "api-lifecycle.md", decisions: ["Operation inventory", "Versioning and deprecation", "Access control"] },
    { path: "idempotency.md", decisions: ["Key scope", "Concurrent duplicates", "Retention and expiry"] },
    { path: "rate-limits.md", decisions: ["Quota dimensions", "Accounting unit", "Counter failures"] },
    { path: "slo.md", decisions: ["SLI definition", "Measurement window", "Error budget policy"] },
  ])("gives API service $path its own decisions for primary and addon use", ({ path, decisions }) => {
    for (const files of [
      templateFilesFor("general", "none", "api-service", "strict"),
      templateFilesFor("backend", "none", "generic", "strict", ["api-service"]),
    ]) {
      const content = files.find((file) => file.path === `docs/api-service/${path}`)?.content;
      expect(content).toBeDefined();
      for (const decision of decisions) expect(content).toContain(decision);
      expect(content).toContain("docs/api-service/README.md");
      expect(content).toContain("UNDECIDED");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });

  it.each(["backend", "fullstack"] as const)("keeps minimal %s error decisions in the documents that actually exist", (scope) => {
    const files = templateFilesFor(scope, "none", "generic", "minimal");
    expect(files.some((file) => file.path === "docs/backend/05-error-response.md")).toBe(false);
    for (const filePath of ["docs/backend/README.md", "docs/backend/00-api-server-boundary.md"]) {
      const content = files.find((file) => file.path === filePath)?.content;
      expect(content).toBeDefined();
      expect(content).not.toContain("docs/backend/05-error-response.md");
      expect(content).toMatch(/Error response policy: UNDECIDED.*this document/iu);
    }
  });

  it.each([
    { path: "docs/engineering/08-threat-model.md", decisions: [/Assets/u, /Trust boundaries/u, /Attacker capabilities/u] },
    { path: "docs/engineering/09-data-integrity.md", decisions: [/Invariants/u, /Transaction boundaries/u, /Reconciliation/u] },
    { path: "docs/ops/disaster-recovery.md", decisions: [/RTO/u, /RPO/u, /Restore exercise/u] },
    { path: "docs/ops/service-levels.md", decisions: [/SLI/u, /Measurement window/u, /Error budget/u] },
  ])("generates actionable decisions for $path", ({ path, decisions }) => {
    const content = templateFilesFor("general", "none", "generic", "strict").find((file) => file.path === path)?.content;
    expect(content).toBeDefined();
    for (const decision of decisions) expect(content).toMatch(decision);
    expect(content).toContain("UNDECIDED");
  });

  it("keeps shared CLI guidance in the README and gives each CLI contract distinct decisions", () => {
    const files = templateFilesFor("general", "none", "cli-tool", "strict");
    expect(files.find((file) => file.path === "docs/cli/README.md")?.content).toContain("## Repository Type Contract");
    const expected = [
      ["command-contract.md", "Argument grammar"], ["configuration.md", "Configuration precedence"],
      ["output-and-exit-codes.md", "Output schema"], ["shell-completion.md", "Supported shells"],
    ];
    for (const [name, decision] of expected) {
      const content = files.find((file) => file.path === `docs/cli/${name}`)?.content;
      expect(content).toContain(decision);
      expect(content).toContain("docs/cli/README.md");
      expect(content).not.toContain("## Repository Type Contract");
    }
  });
});
