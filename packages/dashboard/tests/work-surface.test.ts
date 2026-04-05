import { describe, expect, it } from "vitest";
import { buildTaskCreatePayload, sortTasksForDisplay, sortWorktreesForDisplay, suggestWorktreeName } from "../src/lib/work-surface.ts";
import type { ApiTask, ApiWorktree } from "../src/lib/api-client.ts";

describe("work-surface helpers", () => {
  it("builds a normalized task payload from the form draft", () => {
    expect(
      buildTaskCreatePayload({
        title: "  Improve work surface UX  ",
        description: "  Add task metadata  ",
        priority: "3",
        blockedBy: ["task-1", "task-1", " task-2 "],
        acceptanceCriteria: "first check\n\nsecond check\n"
      })
    ).toEqual({
      title: "Improve work surface UX",
      description: "Add task metadata",
      priority: 3,
      blockedBy: ["task-1", "task-2"],
      acceptanceCriteria: ["first check", "second check"]
    });
  });

  it("rejects an empty task title", () => {
    expect(() =>
      buildTaskCreatePayload({
        title: "   ",
        description: "",
        priority: "0",
        blockedBy: [],
        acceptanceCriteria: ""
      })
    ).toThrow("Task title is required.");
  });

  it("suggests a safe worktree name from task text", () => {
    expect(suggestWorktreeName("Ship runtime UX + work surface polish!")).toBe("ship-runtime-ux-work-surface-polish");
    expect(suggestWorktreeName("   ")).toBe("new-worktree");
  });

  it("sorts active tasks ahead of blocked and completed ones", () => {
    const tasks: ApiTask[] = [
      {
        id: "completed",
        title: "Completed",
        description: "",
        status: "completed",
        priority: 1,
        blockedBy: [],
        acceptanceCriteria: [],
        createdAt: "2026-04-04T10:00:00.000Z",
        updatedAt: "2026-04-04T10:00:00.000Z"
      },
      {
        id: "blocked",
        title: "Blocked",
        description: "",
        status: "pending",
        priority: 3,
        blockedBy: ["active"],
        acceptanceCriteria: [],
        createdAt: "2026-04-04T10:00:00.000Z",
        updatedAt: "2026-04-04T10:02:00.000Z"
      },
      {
        id: "ready",
        title: "Ready",
        description: "",
        status: "pending",
        priority: 2,
        blockedBy: [],
        acceptanceCriteria: [],
        createdAt: "2026-04-04T10:00:00.000Z",
        updatedAt: "2026-04-04T10:03:00.000Z"
      },
      {
        id: "active",
        title: "Active",
        description: "",
        status: "in_progress",
        priority: 0,
        blockedBy: [],
        acceptanceCriteria: [],
        createdAt: "2026-04-04T10:00:00.000Z",
        updatedAt: "2026-04-04T10:04:00.000Z"
      }
    ];

    expect(sortTasksForDisplay(tasks).map((task) => task.id)).toEqual(["active", "ready", "blocked", "completed"]);
  });

  it("sorts worktrees with active ones first and newest first inside the same status", () => {
    const worktrees: ApiWorktree[] = [
      {
        id: "merged",
        name: "Merged",
        path: "C:/repo/.allcli/worktrees/merged",
        branch: "worktree/merged",
        createdAt: "2026-04-04T10:00:00.000Z",
        status: "merged"
      },
      {
        id: "active-new",
        name: "Active New",
        path: "C:/repo/.allcli/worktrees/active-new",
        branch: "worktree/active-new",
        createdAt: "2026-04-04T10:03:00.000Z",
        status: "active"
      },
      {
        id: "active-old",
        name: "Active Old",
        path: "C:/repo/.allcli/worktrees/active-old",
        branch: "worktree/active-old",
        createdAt: "2026-04-04T10:01:00.000Z",
        status: "active"
      }
    ];

    expect(sortWorktreesForDisplay(worktrees).map((worktree) => worktree.id)).toEqual([
      "active-new",
      "active-old",
      "merged"
    ]);
  });
});
