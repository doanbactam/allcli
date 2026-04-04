export type SessionStatus =
  | "idle"
  | "spawning"
  | "working"
  | "pr_open"
  | "ci_failed"
  | "review_pending"
  | "changes_requested"
  | "approved"
  | "mergeable"
  | "merged"
  | "cleanup"
  | "needs_input"
  | "stuck"
  | "errored"
  | "killed"
  | "done";

export type SessionEventName =
  | "session.spawned"
  | "session.working"
  | "session.done"
  | "session.errored"
  | "session.killed"
  | "session.output"
  | "session.transition"
  | "pr.created"
  | "pr.updated"
  | "pr.merged"
  | "pr.closed"
  | "ci.passing"
  | "ci.failing"
  | "review.pending"
  | "review.approved"
  | "review.changes_requested"
  | "merge.ready"
  | "merge.conflicts"
  | "merge.completed";

export interface SessionRecord {
  id: string;
  task: string;
  provider: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  pid?: number;
  exitCode?: number;
  error?: string;
}
