import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import type { CleanupResult, CreateWorktreeOptions, Worktree } from "./types.js";

interface StoredWorktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  sessionId?: string;
  createdAt: string;
}

interface PorcelainWorktreeEntry {
  path: string;
  branch: string;
}

export class WorktreeManager {
  constructor(
    private readonly workspaceRoot: string,
    private readonly stateFilePath = resolve(workspaceRoot, ".allcli", "worktrees.json")
  ) {}

  async create(options: CreateWorktreeOptions): Promise<Worktree> {
    const baseBranch = options.baseBranch ?? this.resolveBaseBranch();
    const branch = options.branch ?? `worktree/${options.name}`;
    const worktreePath = options.isolated
      ? join(this.workspaceRoot, ".allcli", "worktrees", options.name)
      : join(this.workspaceRoot, options.name);

    execFileSync("git", ["worktree", "add", "-b", branch, worktreePath, baseBranch], {
      cwd: this.workspaceRoot,
      encoding: "utf8"
    });

    const now = new Date().toISOString();
    const created: StoredWorktree = {
      id: randomUUID(),
      name: options.name,
      path: resolve(worktreePath),
      branch,
      createdAt: now
    };

    const records = this.loadRecords();
    records.push(created);
    this.saveRecords(records);

    return {
      ...created,
      status: "active"
    };
  }

  async list(): Promise<Worktree[]> {
    const parsed = this.parseWorktreePorcelain();
    const records = this.loadRecords();
    const byPath = new Map(records.map((record) => [resolve(record.path), record]));
    const mergedBranches = this.getMergedBranches();
    let changed = false;

    const listed = parsed.map((entry) => {
      const absolutePath = resolve(entry.path);
      let record = byPath.get(absolutePath);
      if (!record) {
        record = {
          id: randomUUID(),
          name: this.nameFromPath(absolutePath),
          path: absolutePath,
          branch: entry.branch,
          createdAt: new Date().toISOString()
        };
        records.push(record);
        byPath.set(absolutePath, record);
        changed = true;
      }

      const normalizedBranch = normalizeBranchName(entry.branch);
      if (record.branch !== normalizedBranch) {
        record.branch = normalizedBranch;
        changed = true;
      }

      const status = !existsSync(record.path)
        ? "stale"
        : normalizedBranch !== "(detached)" && mergedBranches.has(normalizedBranch)
          ? "merged"
          : "active";

      const result: Worktree = {
        id: record.id,
        name: record.name,
        path: record.path,
        branch: record.branch,
        createdAt: record.createdAt,
        status,
        ...(record.sessionId ? { sessionId: record.sessionId } : {})
      };

      return result;
    });

    if (changed) {
      this.saveRecords(records);
    }

    return listed;
  }

  async remove(worktreeId: string): Promise<void> {
    const records = this.loadRecords();
    const target = records.find((record) => record.id === worktreeId || record.id.startsWith(worktreeId));
    if (!target) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }

    if (existsSync(target.path)) {
      execFileSync("git", ["worktree", "remove", target.path], {
        cwd: this.workspaceRoot,
        encoding: "utf8"
      });
    }

    this.saveRecords(records.filter((record) => record.id !== target.id));
  }

  async cleanup(options?: { dryRun?: boolean }): Promise<CleanupResult> {
    const dryRun = options?.dryRun ?? false;
    const records = this.loadRecords();
    const listed = await this.list();

    // Filter out the main worktree (first entry from git worktree list)
    const mainPath = resolve(this.workspaceRoot);
    const removable = listed.filter(
      (worktree) =>
        (worktree.status === "merged" || worktree.status === "stale") &&
        resolve(worktree.path) !== mainPath
    );
    const removableIds = new Set(removable.map((worktree) => worktree.id));

    if (!dryRun) {
      for (const worktree of removable) {
        if (worktree.status !== "stale") {
          execFileSync("git", ["worktree", "remove", worktree.path], {
            cwd: this.workspaceRoot,
            encoding: "utf8"
          });
        }
      }
      const keptRecords = records.filter((record) => !removableIds.has(record.id));
      this.saveRecords(keptRecords);
    }

    return {
      removed: removable.map((worktree) => worktree.id),
      kept: listed.filter((worktree) => !removableIds.has(worktree.id)).map((worktree) => worktree.id),
      dryRun
    };
  }

  private resolveBaseBranch(): string {
    try {
      const output = execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
        cwd: this.workspaceRoot,
        encoding: "utf8"
      }).trim();
      return output || "main";
    } catch {
      return "main";
    }
  }

  private parseWorktreePorcelain(): PorcelainWorktreeEntry[] {
    const output = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd: this.workspaceRoot,
      encoding: "utf8"
    });

    const entries: PorcelainWorktreeEntry[] = [];
    const lines = output.split(/\r?\n/);
    let currentPath = "";
    let currentBranch = "(detached)";

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (currentPath) {
          entries.push({ path: currentPath, branch: currentBranch });
        }
        currentPath = line.slice("worktree ".length).trim();
        currentBranch = "(detached)";
        continue;
      }

      if (line.startsWith("branch ")) {
        currentBranch = normalizeBranchName(line.slice("branch ".length).trim());
      }
    }

    if (currentPath) {
      entries.push({ path: currentPath, branch: currentBranch });
    }

    return entries;
  }

  private getMergedBranches(): Set<string> {
    try {
      const output = execFileSync("git", ["branch", "--merged"], {
        cwd: this.workspaceRoot,
        encoding: "utf8"
      });
      const names = output
        .split(/\r?\n/)
        .map((line) => line.replace(/^\*\s*/, "").trim())
        .filter((line) => Boolean(line));
      return new Set(names);
    } catch {
      return new Set<string>();
    }
  }

  private nameFromPath(worktreePath: string): string {
    const parts = worktreePath.split(/[/\\]+/);
    return parts[parts.length - 1] || worktreePath;
  }

  private loadRecords(): StoredWorktree[] {
    if (!existsSync(this.stateFilePath)) {
      return [];
    }

    const raw = readFileSync(this.stateFilePath, "utf8");
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as StoredWorktree[];
  }

  private saveRecords(records: StoredWorktree[]): void {
    const absolute = resolve(this.stateFilePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(records, null, 2));
  }
}

function normalizeBranchName(branchRef: string): string {
  if (branchRef.startsWith("refs/heads/")) {
    return branchRef.slice("refs/heads/".length);
  }

  return branchRef;
}
