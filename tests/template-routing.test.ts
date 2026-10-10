import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const omittedTopic = vi.hoisted(() => ({ path: "" }));
const omittedSkill = vi.hoisted(() => ({ name: "" }));

vi.mock("../src/templates/task-skills.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/task-skills.js")>();
  return { ...original, renderTaskSkill: (...args: Parameters<typeof original.renderTaskSkill>) =>
    args[0] === omittedSkill.name ? undefined : original.renderTaskSkill(...args) };
});
vi.mock("../src/templates/scope-skills.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/scope-skills.js")>();
  return { ...original, renderScopeSkill: (...args: Parameters<typeof original.renderScopeSkill>) =>
    args[0] === omittedSkill.name ? undefined : original.renderScopeSkill(...args) };
});
vi.mock("../src/templates/profile-skills.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/profile-skills.js")>();
  return { ...original, renderProfileSkill: (...args: Parameters<typeof original.renderProfileSkill>) =>
    args[0] === omittedSkill.name ? undefined : original.renderProfileSkill(...args) };
});

vi.mock("../src/templates/topics/architecture.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/topics/architecture.js")>();
  return { ...original, architectureTopics: new Proxy(original.architectureTopics, {
    get: (target, property) => property === omittedTopic.path ? undefined : Reflect.get(target, property),
  }) };
});
vi.mock("../src/templates/topics/backend.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/topics/backend.js")>();
  return { ...original, backendTopics: new Proxy(original.backendTopics, {
    get: (target, property) => property === omittedTopic.path ? undefined : Reflect.get(target, property),
  }) };
});
vi.mock("../src/templates/topics/engineering.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/topics/engineering.js")>();
  return { ...original, engineeringTopics: new Proxy(original.engineeringTopics, {
    get: (target, property) => property === omittedTopic.path ? undefined : Reflect.get(target, property),
  }) };
});
vi.mock("../src/templates/topics/operations.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/templates/topics/operations.js")>();
  return { ...original, operationsTopics: new Proxy(original.operationsTopics, {
    get: (target, property) => property === omittedTopic.path ? undefined : Reflect.get(target, property),
  }) };
});

const workdirs: string[] = [];
afterEach(async () => {
  omittedTopic.path = "";
  omittedSkill.name = "";
  vi.resetModules();
  await Promise.all(workdirs.splice(0).map((dir) => {
    const resolved = path.resolve(dir);
    expect(path.dirname(resolved)).toBe(path.resolve(tmpdir()));
    expect(path.basename(resolved).startsWith("ssealed-routing-")).toBe(true);
    return rm(resolved, { recursive: true, force: true });
  }));
});

describe("required agent skill routing", () => {
  it.each([
    { scope: "general", profile: "generic", addons: [], missing: "feature" },
    { scope: "backend", profile: "generic", addons: [], missing: "backend-api" },
    { scope: "general", profile: "library", addons: [], missing: "library-package" },
    { scope: "general", profile: "generic", addons: ["sdk"], missing: "sdk" },
  ] as const)("rejects a missing $missing definition without leaving scaffold files or locks", async ({ scope, profile, addons, missing }) => {
    omittedSkill.name = missing;
    vi.resetModules();
    const { executeScaffold } = await import("../src/core/scaffold.js");
    const target = await mkdtemp(path.join(tmpdir(), "ssealed-routing-"));
    workdirs.push(target);
    await expect(executeScaffold({ target, scope, profile, addons, runner: "none", density: "strict", dryRun: false, force: false })).rejects.toThrow(`Missing required agent skill: .agents/skills/${missing}/SKILL.md`);
    expect(await readdir(target)).toEqual([]);
  });
});

describe("required document routing", () => {
  it.each([
    { scope: "general", missing: "docs/architecture/03-quality-attributes.md" },
    { scope: "backend", missing: "docs/backend/03-persistence-model.md" },
    { scope: "general", missing: "docs/engineering/03-performance-budget.md" },
    { scope: "general", missing: "docs/ops/release.md" },
  ] as const)("rejects a missing $missing topic before planning any writes", async ({ scope, missing }) => {
    omittedTopic.path = missing;
    vi.resetModules();
    const { planScaffold } = await import("../src/core/scaffold.js");
    const target = await mkdtemp(path.join(tmpdir(), "ssealed-routing-"));
    workdirs.push(target);
    await expect(planScaffold({ target, scope, runner: "none", density: "strict", dryRun: true, force: false })).rejects.toThrow(`Missing required topic contract: ${missing}`);
    expect(await readdir(target)).toEqual([]);
  });
});
