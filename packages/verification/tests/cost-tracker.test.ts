import { describe, expect, it } from "vitest";
import { CostTracker } from "../src/cost-tracker.js";

describe("CostTracker", () => {
  it("records and retrieves session costs", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 100,
      inputTokens: 50,
      outputTokens: 50,
      estimatedCost: 0.5,
      currency: "USD"
    });
    const cost = tracker.getSessionCost("sess-1");
    expect(cost.totalTokens).toBe(100);
    expect(cost.inputTokens).toBe(50);
    expect(cost.outputTokens).toBe(50);
    expect(cost.estimatedCost).toBe(0.5);
    expect(cost.currency).toBe("USD");
  });

  it("tracks session status correctly", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 100,
      inputTokens: 50,
      outputTokens: 50,
      estimatedCost: 0.5,
      currency: "USD"
    });

    const status = tracker.checkBudget("sess-1");
    expect(status.withinBudget).toBe(true);
    // used = sessionCost(0.5) + projectCost(0.5) = 1.0
    expect(status.used).toBe(1);
    expect(status.limit).toBe(10);
    expect(status.remaining).toBe(9.5);
    expect(status.percentUsed).toBe(5);
  });

  it("detects budget overflow", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 1000,
      inputTokens: 500,
      outputTokens: 500,
      estimatedCost: 15,
      currency: "USD"
    });

    const status = tracker.checkBudget("sess-1");
    expect(status.withinBudget).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.percentUsed).toBe(150);
  });

  it("aggregates project costs correctly", () => {
    const tracker = new CostTracker(100, 10);
    tracker.record("sess-1", {
      totalTokens: 100,
      inputTokens: 50,
      outputTokens: 50,
      estimatedCost: 0.5,
      currency: "USD"
    });
    tracker.record("sess-2", {
      totalTokens: 200,
      inputTokens: 100,
      outputTokens: 100,
      estimatedCost: 1,
      currency: "USD"
    });

    const projectCost = tracker.getProjectCost();
    expect(projectCost.totalTokens).toBe(300);
    expect(projectCost.estimatedCost).toBe(1.5);
  });
});
