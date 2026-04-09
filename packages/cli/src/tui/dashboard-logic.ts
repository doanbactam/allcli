import type { SessionRecord } from "@allcli/core";
import type { Task } from "@allcli/workspace";

export type AssignableSessionStatus =
  | "working"
  | "spawning"
  | "needs_input"
  | "stuck"
  | "idle"
  | "pr_open"
  | "review_pending"
  | "ci_failed"
  | "changes_requested"
  | "approved"
  | "mergeable";

const ASSIGNABLE_PRIORITY: Record<AssignableSessionStatus, number> = {
  working: 0,
  spawning: 1,
  needs_input: 2,
  stuck: 3,
  idle: 4,
  pr_open: 5,
  review_pending: 6,
  ci_failed: 7,
  changes_requested: 8,
  approved: 9,
  mergeable: 10,
};

const ASSIGNABLE_STATUSES = new Set<AssignableSessionStatus>(Object.keys(ASSIGNABLE_PRIORITY) as AssignableSessionStatus[]);

export function getAssignableSessions(sessions: SessionRecord[]): SessionRecord[] {
  return sessions
    .filter((session) => ASSIGNABLE_STATUSES.has(session.status as AssignableSessionStatus))
    .slice()
    .sort((a, b) => {
      const aPriority = ASSIGNABLE_PRIORITY[a.status as AssignableSessionStatus];
      const bPriority = ASSIGNABLE_PRIORITY[b.status as AssignableSessionStatus];
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export function canAssignTask(task: Task): { ok: boolean; reason?: string } {
  if (task.status === "completed") {
    return { ok: false, reason: "Completed tasks should not be reassigned" };
  }

  if (task.status === "failed") {
    return { ok: false, reason: "Failed tasks must be reviewed before reassignment" };
  }

  if (task.status === "blocked" || (task.status === "pending" && task.blockedBy.length > 0)) {
    return { ok: false, reason: "Blocked tasks cannot be assigned until dependencies clear" };
  }

  return { ok: true };
}

export function nextAssignedTaskStatus(task: Task): Task["status"] {
  if (task.status === "pending") {
    return "in_progress";
  }

  return task.status;
}

export function canDecomposeTask(task: Task, allTasks: Task[]): { ok: boolean; reason?: string } {
  if (task.status === "completed") {
    return { ok: false, reason: "Completed tasks should not be decomposed" };
  }

  if (task.status === "failed") {
    return { ok: false, reason: "Failed tasks should be fixed before decomposition" };
  }

  const hasChildren = allTasks.some((candidate) => candidate.blockedBy.includes(task.id));
  if (hasChildren) {
    return { ok: false, reason: "Task already has subtasks" };
  }

  return { ok: true };
}

export function normalizeTaskTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
