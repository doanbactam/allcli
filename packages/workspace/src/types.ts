export interface CreateWorktreeOptions {
  name: string;
  branch?: string;
  baseBranch?: string;
  isolated: boolean;
}

export interface Worktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  sessionId?: string;
  createdAt: string;
  status: "active" | "merged" | "stale";
}

export interface CleanupResult {
  removed: string[];
  kept: string[];
  dryRun: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked" | "failed";
  priority: number;
  blockedBy: string[];
  assignedAgent?: string;
  worktreeId?: string;
  acceptanceCriteria: string[];
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  tokensUsed: number;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  read: boolean;
}
