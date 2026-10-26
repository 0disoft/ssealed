import { describe, expect, it } from "vitest";
import { densities, scopes } from "../src/core/types.js";
import { rootAgents, rootReadme } from "../src/templates/documents.js";

describe("generated project instructions", () => {
  it("allows authorized implementation without treating unresolved drafts as approval", () => {
    for (const scope of scopes) {
      for (const density of densities) {
        const agents = rootAgents(scope, "generic", [], density);
        expect(agents).not.toMatch(/Do not generate or infer application source code|This repository does not generate (?:runtime infrastructure code|production datasets)/u);
        expect(agents).toContain("Follow approved requirements");
        expect(agents).toContain("an unresolved draft grants no implementation, migration, or deployment authority");
        expect(agents).toContain("Authorized project work may still");
      }
    }
    expect(rootAgents("backend", "generic")).toContain("does not own frontend routing");
    expect(rootAgents("frontend", "generic")).toContain("does not own backend internals");
  });

  it("distinguishes backend example payloads from adopted project contracts", () => {
    const standard = rootAgents("backend", "generic");
    expect(standard).toContain("illustrative, unadopted examples, not accepted API policy");
    const minimal = rootAgents("backend", "generic", [], "minimal");
    expect(minimal).not.toContain("api/examples");
    for (const scope of ["backend", "frontend", "fullstack"] as const) {
      expect(rootAgents(scope, "generic")).toMatch(/draft|unadopted/u);
    }
  });

  it("describes the scaffold alongside project-owned implementation", () => {
    for (const scope of scopes) {
      const readme = rootReadme(scope, "generic");
      expect(readme).not.toContain("It is not application source code");
      expect(readme).toContain("Application and infrastructure implementation are owned by the project");
    }
  });
});
