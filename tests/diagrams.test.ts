import path from "node:path";
import { describe, expect, it } from "vitest";
import { densities, scopes } from "../src/core/types.js";
import { templateFilesFor } from "../src/templates/index.js";

describe("topic-specific diagram scaffolds", () => {
  it.each([
    { scope: "general", name: "system-context", labels: ["External actor", "Owned system", "External system"] },
    { scope: "general", name: "container-view", labels: ["Entry component", "Core component", "State owner"] },
    { scope: "general", name: "core-runtime-flow", labels: ["Completion predicate", "Partial or unknown outcome", "Recovery owner"] },
    { scope: "general", name: "release-flow", labels: ["Candidate artifact", "Promotion", "Recovery decision"] },
    { scope: "general", name: "rollback-flow", labels: ["Recovery target", "Reversible", "Reconcile or compensate"] },
    { scope: "backend", name: "data-model", labels: ["Entity identity", "Relationship and cardinality", "Invariant"] },
    { scope: "backend", name: "auth-flow", labels: ["Identity evidence", "Authentication policy", "Rejected identity"] },
    { scope: "backend", name: "authorization-flow", labels: ["Authenticated principal", "Resource and action", "Denied action"] },
    { scope: "backend", name: "request-lifecycle", labels: ["Request contract", "Effect owner", "Public response", "Partial or unknown outcome"] },
    { scope: "frontend", name: "user-flow", labels: ["User intent", "Observable outcome", "Recovery or exit"] },
    { scope: "frontend", name: "route-map", labels: ["Entry route", "Route guard", "Unavailable route"] },
    { scope: "frontend", name: "state-ownership", labels: ["Canonical owner", "Derived state", "Invalidation"] },
    { scope: "frontend", name: "component-boundary", labels: ["Parent owner", "Component contract", "Child responsibility"] },
    { scope: "mobile", name: "mobile-user-flow", labels: ["App lifecycle", "Platform capability", "Interrupted work"] },
    { scope: "infra", name: "infra-boundary", labels: ["Declared inputs", "Resource owner", "State authority"] },
    { scope: "data", name: "data-lineage", labels: ["Input dataset", "Transformation", "Published dataset", "Quarantine"] },
  ] as const)("makes $name a draft of its actual topic", ({ scope, name, labels }) => {
    for (const density of densities) {
      const files = templateFilesFor(scope, "none", "generic", density);
      const diagram = files.find((file) => file.path === `diagrams/${name}.mmd`);
      if (density === "minimal") { expect(diagram).toBeUndefined(); continue; }
      expect(diagram?.content).toContain("%% Draft:");
      expect(diagram?.content).toContain("not accepted architecture");
      for (const label of labels) expect(diagram?.content).toContain(`${label}: UNDECIDED`);
      expect(diagram?.content).not.toContain("Review source of truth");
      const source = /%% Source: (\S+)/u.exec(diagram!.content)?.[1];
      expect(source).toBeDefined();
      expect(files.some((file) => file.path === source)).toBe(true);
    }
  });

  it.each(["frontend", "fullstack"] as const)("keeps the request lifecycle within %s ownership", (scope) => {
    const files = templateFilesFor(scope, "none", "generic", "standard");
    const diagram = files.find((file) => file.path === "diagrams/request-lifecycle.mmd")!.content;
    if (scope === "frontend") {
      expect(diagram).toContain("%% Source: docs/integrations/backend-api.md");
      expect(diagram).toContain("Stale response: UNDECIDED");
      expect(diagram).toContain("Cancellation or timeout: UNDECIDED");
      expect(diagram).not.toContain("Effect owner");
      expect(diagram).not.toContain("docs/backend/");
    } else {
      expect(diagram).toContain("%% Source: docs/backend/04-http-api-policy.md");
      expect(diagram).toContain("Effect owner: UNDECIDED");
    }
  });

  it("indexes only emitted diagrams and sources at each scope and density", () => {
    for (const scope of scopes) for (const density of densities) {
      const files = templateFilesFor(scope, "none", "cli-tool", density);
      const diagrams = files.filter((file) => file.path.endsWith(".mmd"));
      const index = files.find((file) => file.path === "diagrams/README.md");
      if (density === "minimal") { expect(index).toBeUndefined(); expect(diagrams).toHaveLength(0); continue; }
      const links = [...index!.content.matchAll(/\]\(([^)]+)\)/gu)].map((match) => path.posix.normalize(path.posix.join("diagrams", match[1]!)));
      expect(links.filter((link) => link.endsWith(".mmd")).sort()).toEqual(diagrams.map((file) => file.path).sort());
      for (const link of links) expect(files.some((file) => file.path === link), `Missing ${link}`).toBe(true);
      const bodies = diagrams.map((file) => file.content.split("\n").filter((line) => !line.startsWith("%%")).join("\n"));
      expect(new Set(bodies).size).toBe(diagrams.length);
      expect(index!.content).toContain("not accepted architecture");
    }
  });
});
