import { describe, expect, it } from "vitest";
import type { SessionRecord } from "@allcli/core";
import type { Task } from "@allcli/workspace";
import {
  canAssignTask,
  canDecomposeTask,
  canExecuteTask,
  getAssignableSessions,
  getAllowedTaskStatuses,
  nextAssignedTaskStatus,
  normalizeTaskTitle,
  normalizeWorktreeName,
} from "../src/tui/dashboard-logic";

function makeSession(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: "session-1",
    task: "demo",
    provider: "claude",
    status: "working",
    createdAt: "2026-04-09T10:00:00.000Z",
    updatedAt: "2026-04-09T10:00:00.000Z",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "demo",
    description: "",
    status: "pending",
    priority: 0,
    blockedBy: [],
    acceptanceCriteria: [],
    createdAt: "2026-04-09T10:00:00.000Z",
    updatedAt: "2026-04-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard logic", () => {
  it("orders assignable sessions by activity priority", () => {
    const sessions = [
      makeSession({ id: "done", status: "done", updatedAt: "2026-04-09T10:00:03.000Z" }),
      makeSession({ id: "spawn", status: "spawning", updatedAt: "2026-04-09T10:00:01.000Z" }),
      makeSession({ id: "work", status: "working", updatedAt: "2026-04-09T10:00:00.000Z" }),
      makeSession({ id: "input", status: "needs_input", updatedAt: "2026-04-09T10:00:02.000Z" }),
    ];

    expect(getAssignableSessions(sessions).map((session) => session.id)).toEqual(["work", "spawn", "input"]);
  });

  it("does not allow assigning completed or failed tasks", () => {
    expect(canAssignTask(makeTask({ status: "completed" }))).toEqual({
      ok: false,
      reason: "Completed tasks should not be reassigned",
    });
    expect(canAssignTask(makeTask({ status: "failed" }))).toEqual({
      ok: false,
      reason: "Failed tasks must be reviewed before reassignment",
    });
    expect(canAssignTask(makeTask({ status: "pending" }))).toEqual({ ok: true });
  });

  it("keeps blocked tasks blocked when assigning", () => {
    expect(nextAssignedTaskStatus(makeTask({ status: "blocked", blockedBy: ["parent"] }))).toBe("blocked");
    expect(nextAssignedTaskStatus(makeTask({ status: "pending", blockedBy: [] }))).toBe("in_progress");
    expect(nextAssignedTaskStatus(makeTask({ status: "in_progress" }))).toBe("in_progress");
  });

  it("prevents duplicate decomposition when subtasks already exist", () => {
    const parent = makeTask({ id: "parent" });
    const child = makeTask({ id: "child", blockedBy: ["parent"] });

    expect(canDecomposeTask(parent, [parent, child])).toEqual({
      ok: false,
      reason: "Task already has subtasks",
    });
    expect(canDecomposeTask(makeTask({ status: "completed" }), [parent])).toEqual({
      ok: false,
      reason: "Completed tasks should not be decomposed",
    });
    expect(canDecomposeTask(parent, [parent])).toEqual({ ok: true });
  });

  it("normalizes task titles from free-form input", () => {
    expect(normalizeTaskTitle("  fix   dashboard   logic  ")).toBe("fix dashboard logic");
  });

  it("limits editable task statuses to coherent transitions", () => {
    expect(getAllowedTaskStatuses(makeTask({ status: "pending" }))).toEqual([
      "pending",
      "in_progress",
      "blocked",
      "failed",
    ]);
    expect(getAllowedTaskStatuses(makeTask({ status: "completed" }))).toEqual(["completed"]);
  });

  it("blocks execution for completed, failed, and blocked tasks", () => {
    expect(canExecuteTask(makeTask({ status: "completed" }))).toEqual({
      ok: false,
      reason: "Completed tasks cannot be executed again",
    });
    expect(canExecuteTask(makeTask({ status: "failed" }))).toEqual({
      ok: false,
      reason: "Failed tasks must be reopened before execution",
    });
    expect(canExecuteTask(makeTask({ status: "blocked", blockedBy: ["x"] }))).toEqual({
      ok: false,
      reason: "Blocked tasks cannot execute until dependencies clear",
    });
    expect(canExecuteTask(makeTask({ status: "pending" }))).toEqual({ ok: true });
  });

  it("normalizes worktree names into git-friendly slugs", () => {
    expect(normalizeWorktreeName("  Feature Branch / Fix Header  ")).toBe("feature-branch-/-fix-header");
    expect(normalizeWorktreeName("")).toBe("");
  });
});
