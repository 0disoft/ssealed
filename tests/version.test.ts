import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { toolVersion } from "../src/core/manifest.js";

describe("version synchronization", () => {
  it("keeps package.json and manifest tool version synchronized", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
    expect(toolVersion).toBe(packageJson.version);
  });
});
