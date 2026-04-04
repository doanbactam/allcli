import { createCliContext } from "./context.js";

export async function createWorkspace(name: string, cwd: string): Promise<void> {
  const context = createCliContext(cwd);
  try {
    const worktree = await context.worktreeManager.create({
      name,
      isolated: context.config.workspace.isolation === "worktree"
    });
    process.stdout.write(
      `Created worktree: ${worktree.name}\n  id: ${worktree.id}\n  branch: ${worktree.branch}\n  path: ${worktree.path}\n`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workspace error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

export async function listWorkspaces(cwd: string): Promise<void> {
  const context = createCliContext(cwd);
  try {
    const worktrees = await context.worktreeManager.list();
    if (worktrees.length === 0) {
      process.stdout.write("No worktrees found.\n");
      return;
    }

    for (const wt of worktrees) {
      const shortId = wt.id.slice(0, 8);
      const statusIcon = wt.status === "active" ? "\u2713" : wt.status === "merged" ? "\u2192" : "\u2022";
      process.stdout.write(
        `${statusIcon} ${shortId}  ${wt.status}  ${wt.branch}  ${wt.name}\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not a git repository")) {
      process.stdout.write("Not a git repository. Initialize with 'git init' first.\n");
      return;
    }
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

export async function cleanupWorkspaces(cwd: string, dryRun: boolean = false): Promise<void> {
  const context = createCliContext(cwd);
  const result = await context.worktreeManager.cleanup({ dryRun });
  if (result.removed.length === 0) {
    process.stdout.write("No merged/stale worktrees to clean up.\n");
    return;
  }

  const prefix = dryRun ? "[dry-run] " : "";
  process.stdout.write(`${prefix}Removed ${result.removed.length} worktree(s)\n`);
  for (const id of result.removed) {
    process.stdout.write(`  - ${id.slice(0, 8)}\n`);
  }
}
