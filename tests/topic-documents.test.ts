import { describe, expect, it } from "vitest";
import { templateFilesFor } from "../src/templates/index.js";

describe("topic-specific generated documents", () => {
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
