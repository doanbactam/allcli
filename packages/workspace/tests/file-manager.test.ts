import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileManager } from "../src/file-manager.js";

describe("FileManager", () => {
  it("reads, writes, exists, and searches files", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-file-manager-"));
    const manager = new FileManager(root);

    mkdirSync(join(root, "nested"), { recursive: true });
    await manager.writeFile("nested/output.txt", "hello world");
    writeFileSync(join(root, "nested", "other.log"), "x");

    expect(manager.exists("nested/output.txt")).toBe(true);
    expect(await manager.readFile("nested/output.txt")).toBe("hello world");

    const matches = await manager.searchFiles("nested", "output.txt");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.includes("output.txt")).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});
