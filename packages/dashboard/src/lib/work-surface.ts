import type { ApiTask, ApiWorktree } from "./api-client";

export interface TaskCreateDraft {
  title: string;
  description: string;
  priority: string;
  blockedBy: string[];
  acceptanceCriteria: string;
}

export function buildTaskCreatePayload(draft: TaskCreateDraft): {
  title: string;
  description?: string;
  priority?: number;
  blockedBy?: string[];
  acceptanceCriteria?: string[];
} {
  const title = draft.title.trim();
  if (!title) {
    throw new Error("Task title is required.");
  }

  const description = draft.description.trim();
  const priority = Number.parseInt(draft.priority, 10);
  const blockedBy = Array.from(new Set(draft.blockedBy.map((item) => item.trim()).filter(Boolean)));
  const acceptanceCriteria = draft.acceptanceCriteria
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    title,
    ...(description ? { description } : {}),
    ...(Number.isFinite(priority) ? { priority } : {}),
    ...(blockedBy.length > 0 ? { blockedBy } : {}),
    ...(acceptanceCriteria.length > 0 ? { acceptanceCriteria } : {})
  };
}

export function suggestWorktreeName(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return normalized || "new-worktree";
}

export function sortTasksForDisplay(tasks: ApiTask[]): ApiTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));

  return [...tasks].sort((left, right) => {
    const rank = getTaskDisplayRank(left, byId) - getTaskDisplayRank(right, byId);
    if (rank !== 0) {
      return rank;
    }

    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function sortWorktreesForDisplay(worktrees: ApiWorktree[]): ApiWorktree[] {
  const rank = {
    active: 0,
    merged: 1,
    stale: 2
  } as const;

  return [...worktrees].sort((left, right) => {
    const statusRank = rank[left.status] - rank[right.status];
    if (statusRank !== 0) {
      return statusRank;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function getTaskDependencyState(
  task: ApiTask,
  tasks: ApiTask[]
): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (task.status === "in_progress") {
    return { label: "Active", tone: "warning" };
  }

  if (task.status === "completed") {
    return { label: "Ready to review", tone: "success" };
  }

  if (task.status === "failed") {
    return { label: "Needs retry", tone: "danger" };
  }

  const byId = new Map(tasks.map((item) => [item.id, item]));
  const unresolved = task.blockedBy.filter((dependencyId) => byId.get(dependencyId)?.status !== "completed");
  if (unresolved.length > 0 || task.status === "blocked") {
    return { label: `${unresolved.length || task.blockedBy.length} blockers`, tone: "neutral" };
  }

  return { label: "Ready to pick up", tone: "success" };
}

function getTaskDisplayRank(task: ApiTask, byId: Map<string, ApiTask>): number {
  if (task.status === "in_progress") {
    return 0;
  }

  if (task.status === "pending") {
    const unresolved = task.blockedBy.some((dependencyId) => byId.get(dependencyId)?.status !== "completed");
    return unresolved ? 2 : 1;
  }

  if (task.status === "blocked") {
    return 2;
  }

  if (task.status === "failed") {
    return 3;
  }

  if (task.status === "completed") {
    return 4;
  }

  return 5;
}
