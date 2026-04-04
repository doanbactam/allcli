import { describe, expect, it } from "vitest";
import { SessionStateMachine } from "../src/state-machine.js";

describe("SessionStateMachine", () => {
  const machine = new SessionStateMachine();

  it("allows MVP transitions (spawning → working → done/errored)", () => {
    expect(machine.canTransition("idle", "spawning")).toBe(true);
    expect(machine.canTransition("spawning", "working")).toBe(true);
    expect(machine.canTransition("spawning", "errored")).toBe(true);
    expect(machine.canTransition("spawning", "killed")).toBe(true);
    expect(machine.canTransition("working", "done")).toBe(true);
    expect(machine.canTransition("working", "errored")).toBe(true);
    expect(machine.canTransition("working", "idle")).toBe(true);
    expect(machine.canTransition("working", "killed")).toBe(true);
  });

  it("allows Phase 3 PR/CI/review transitions", () => {
    expect(machine.canTransition("working", "pr_open")).toBe(true);
    expect(machine.canTransition("pr_open", "ci_failed")).toBe(true);
    expect(machine.canTransition("pr_open", "review_pending")).toBe(true);
    expect(machine.canTransition("ci_failed", "working")).toBe(true);
    expect(machine.canTransition("ci_failed", "changes_requested")).toBe(true);
    expect(machine.canTransition("review_pending", "approved")).toBe(true);
    expect(machine.canTransition("review_pending", "changes_requested")).toBe(true);
    expect(machine.canTransition("changes_requested", "working")).toBe(true);
  });

  it("allows merge flow transitions", () => {
    expect(machine.canTransition("approved", "mergeable")).toBe(true);
    expect(machine.canTransition("mergeable", "merged")).toBe(true);
    expect(machine.canTransition("mergeable", "cleanup")).toBe(true);
    expect(machine.canTransition("merged", "cleanup")).toBe(true);
    expect(machine.canTransition("merged", "done")).toBe(true);
    expect(machine.canTransition("cleanup", "done")).toBe(true);
  });

  it("allows stuck/needs_input/errored recovery transitions", () => {
    expect(machine.canTransition("working", "stuck")).toBe(true);
    expect(machine.canTransition("working", "needs_input")).toBe(true);
    expect(machine.canTransition("stuck", "working")).toBe(true);
    expect(machine.canTransition("stuck", "killed")).toBe(true);
    expect(machine.canTransition("needs_input", "working")).toBe(true);
    expect(machine.canTransition("needs_input", "killed")).toBe(true);
    expect(machine.canTransition("errored", "spawning")).toBe(true);
    expect(machine.canTransition("errored", "killed")).toBe(true);
    expect(machine.canTransition("killed", "idle")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(machine.canTransition("spawning", "done")).toBe(false);
    expect(machine.canTransition("done", "working")).toBe(false);
    expect(machine.canTransition("done", "spawning")).toBe(false);
    expect(machine.canTransition("idle", "done")).toBe(false);
    expect(machine.canTransition("approved", "working")).toBe(false);
    expect(machine.canTransition("merged", "working")).toBe(false);
    expect(() => machine.assertTransition("spawning", "done")).toThrow("Illegal session transition");
  });
});
