import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TaskTracker } from "../src/task-tracker.js";

describe("TaskTracker", () => {
  it("creates tasks and resolves dependencies by priority", () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-task-tracker-"));
    const tracker = new TaskTracker(root);

    const base = tracker.create("parent", { priority: 1 });
    const blocked = tracker.create("blocked", { blockedBy: [base.id], priority: 10 });
    const ready = tracker.create("ready", { priority: 5 });

    const initialReady = tracker.resolveDependencies();
    expect(initialReady.map((task) => task.id)).toEqual([ready.id, base.id]);

    tracker.complete(base.id, {
      success: true,
      duration: 10,
      tokensUsed: 5
    });

    const resolved = tracker.resolveDependencies();
    expect(resolved.map((task) => task.id)).toEqual([blocked.id, ready.id]);

    rmSync(root, { recursive: true, force: true });
  });

  it("decomposes a parent task into executable subtasks and blocks the parent on them", () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-task-decompose-"));
    const tracker = new TaskTracker(root);

    const parent = tracker.create("epic");
    const subtasks = tracker.decompose(parent.id, [
      { title: "subtask 1", priority: 2 },
      { title: "subtask 2", description: "desc", priority: 3 }
    ]);

    expect(subtasks).toHaveLength(2);
    expect(subtasks.every((task) => task.blockedBy.length === 0)).toBe(true);

    const updatedParent = tracker.getById(parent.id);
    expect(updatedParent?.status).toBe("blocked");
    expect(updatedParent?.blockedBy).toEqual(subtasks.map((task) => task.id));

    const pending = tracker.list({ status: "pending" });
    expect(pending).toHaveLength(2);

    const blocked = tracker.list({ status: "blocked" });
    expect(blocked.map((task) => task.id)).toContain(parent.id);

    rmSync(root, { recursive: true, force: true });
  });
});
