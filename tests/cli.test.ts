import { describe, expect, it, vi } from "vitest";
import { main } from "../src/cli-main.js";

describe("CLI argument parsing", () => {
  it("rejects more than one init target instead of silently ignoring extra positionals", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(main(["init", "./one", "./two", "--scope", "design", "--dry-run"])).resolves.toBe(1);
      expect(stderr).toHaveBeenCalledWith("ssealed: init accepts at most one target, got 2\n");
      expect(stdout).not.toHaveBeenCalled();
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });
});
