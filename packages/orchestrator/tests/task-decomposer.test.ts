import { describe, expect, it } from "vitest";
import { TaskDecomposer } from "../src/task-decomposer.js";

describe("TaskDecomposer", () => {
  it("splits tasks with 'and' separators", () => {
    const decomposer = new TaskDecomposer();
    const result = decomposer.decompose("Implement auth and add tests and update docs");

    expect(result.subtasks.length).toBe(3);
    expect(result.subtasks[0]?.description.toLowerCase()).toContain("implement auth");
    expect(result.subtasks[1]?.description.toLowerCase()).toContain("add tests");
    expect(result.subtasks[2]?.description.toLowerCase()).toContain("update docs");
  });

  it("splits tasks with numbered items", () => {
    const decomposer = new TaskDecomposer();
    const result = decomposer.decompose("Release prep", "1) update changelog 2) run tests 3) publish package");

    expect(result.subtasks.length).toBe(3);
    expect(result.subtasks[0]?.description.toLowerCase()).toContain("update changelog");
    expect(result.subtasks[1]?.description.toLowerCase()).toContain("run tests");
    expect(result.subtasks[2]?.description.toLowerCase()).toContain("publish package");
  });

  it("applies generic three-step decomposition for simple tasks", () => {
    const decomposer = new TaskDecomposer();
    const result = decomposer.decompose("Improve reliability");

    expect(result.subtasks.length).toBe(3);
    expect(result.subtasks[0]?.description.toLowerCase()).toContain("research");
    expect(result.subtasks[1]?.description.toLowerCase()).toContain("implement");
    expect(result.subtasks[2]?.description.toLowerCase()).toContain("test");
    expect(result.subtasks[1]?.blockedBy).toEqual(["0"]);
    expect(result.subtasks[2]?.blockedBy).toEqual(["1"]);
  });

  it("respects maxDepth", () => {
    const decomposer = new TaskDecomposer({ maxDepth: 2 });
    const result = decomposer.decompose("Implement auth and add tests and update docs");

    expect(result.subtasks.length).toBe(2);
    expect(result.subtasks[0]?.priority).toBeGreaterThan(result.subtasks[1]?.priority ?? 0);
  });
});
