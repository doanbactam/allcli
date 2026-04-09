import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WorktreeManager } from "../src/worktree-manager.js";

describe("WorktreeManager", () => {
  it("creates, lists, and removes a worktree", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-worktree-"));
    setupRepo(root);

    const manager = new WorktreeManager(root);
    const created = await manager.create({
      name: "feature-a",
      branch: "feature-a",
      baseBranch: "HEAD",
      isolated: true
    });

    const listed = await manager.list();
    expect(listed.some((worktree) => worktree.id === created.id)).toBe(true);

    await manager.remove(created.id);

    const after = await manager.list();
    expect(after.some((worktree) => worktree.id === created.id)).toBe(false);

    rmSync(root, { recursive: true, force: true });
  }, 15000);
});

function setupRepo(root: string): void {
  execFileSync("git", ["init"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.name", "AllCLI Test"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root, encoding: "utf8" });
  writeFileSync(join(root, "README.md"), "# repo\n");
  execFileSync("git", ["add", "README.md"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: root, encoding: "utf8" });
}
