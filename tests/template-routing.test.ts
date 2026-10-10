import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const omittedTopic = vi.hoisted(() => ({ path: "" }));

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
  vi.resetModules();
  await Promise.all(workdirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
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
