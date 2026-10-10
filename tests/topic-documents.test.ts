import { describe, expect, it } from "vitest";
import { templateFilesFor } from "../src/templates/index.js";

describe("topic-specific generated documents", () => {
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
