import { describe, expect, it } from "vitest";
import { CostTracker } from "../src/cost-tracker.js";

describe("CostTracker", () => {
  it("records and retrieves session costs", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 1000,
      inputTokens: 800,
      outputTokens: 200,
      estimatedCost: 0.05,
      currency: "USD"
    });

    const cost = tracker.getSessionCost("sess-1");
    expect(cost.totalTokens).toBe(1000);
    expect(cost.estimatedCost).toBe(0.05);
  });

  it("returns zero cost for unknown sessions", () => {
    const tracker = new CostTracker();
    const cost = tracker.getSessionCost("unknown");
    expect(cost.totalTokens).toBe(0);
    expect(cost.estimatedCost).toBe(0);
  });

  it("aggregates project costs across sessions", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 1000,
      inputTokens: 800,
      outputTokens: 200,
      estimatedCost: 0.05,
      currency: "USD"
    });
    tracker.record("sess-2", {
      totalTokens: 2000,
      inputTokens: 1500,
      outputTokens: 500,
      estimatedCost: 0.10,
      currency: "USD"
    });

    const project = tracker.getProjectCost();
    expect(project.totalTokens).toBe(3000);
    expect(project.estimatedCost).toBeCloseTo(0.15);
  });

  it("reports budget status correctly", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 1000,
      inputTokens: 800,
      outputTokens: 200,
      estimatedCost: 5,
      currency: "USD"
    });

    const status = tracker.checkBudget("sess-1");
    expect(status.withinBudget).toBe(true);
    expect(status.percentUsed).toBe(50);
  });

  it("detects budget overrun", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 1000,
      inputTokens: 800,
      outputTokens: 200,
      estimatedCost: 15,
      currency: "USD"
    });

    const status = tracker.checkBudget("sess-1");
    expect(status.withinBudget).toBe(false);
  });
});
