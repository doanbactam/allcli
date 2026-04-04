import { describe, expect, it } from "vitest";
import { RalphLoop } from "../src/ralph-loop.js";

describe("RalphLoop", () => {
  it("completes when completion signal is found", async () => {
    const loop = new RalphLoop(
      {
        maxIterations: 5,
        qualityGates: ["typecheck", "lint", "test", "build"],
        completionSignal: "COMPLETE",
        iterationTimeoutMs: 1_000,
        contextRefreshStrategy: "fresh"
      },
      async (iteration) => ({
        output: iteration >= 2 ? "COMPLETE" : "Working",
        tokensUsed: 10,
        cost: 0.01,
        duration: 50
      })
    );

    const result = await loop.run("Do work");
    expect(result.completed).toBe(true);
    expect(result.stopReason).toBe("completed");
    expect(result.iterations.length).toBe(2);
  });

  it("stops at maxIterations when no completion signal is found", async () => {
    const loop = new RalphLoop(
      {
        maxIterations: 3,
        qualityGates: ["typecheck", "lint", "test", "build"],
        completionSignal: "COMPLETE",
        iterationTimeoutMs: 1_000,
        contextRefreshStrategy: "fresh"
      },
      async () => ({
        output: "still working",
        tokensUsed: 5,
        cost: 0.001,
        duration: 25
      })
    );

    const result = await loop.run("Do work");
    expect(result.completed).toBe(false);
    expect(result.stopReason).toBe("max_iterations");
    expect(result.iterations.length).toBe(3);
  });

  it("extracts learnings from output", async () => {
    const loop = new RalphLoop(
      {
        maxIterations: 2,
        qualityGates: ["typecheck", "lint", "test", "build"],
        completionSignal: "COMPLETE",
        iterationTimeoutMs: 1_000,
        contextRefreshStrategy: "fresh"
      },
      async (iteration) => ({
        output: iteration === 1 ? "LEARNING: Keep functions small" : "COMPLETE",
        tokensUsed: 7,
        cost: 0.002,
        duration: 30
      })
    );

    const result = await loop.run("Do work");
    expect(result.learnings).toEqual(["Keep functions small"]);
  });

  it("supports fresh vs cumulative context strategies", async () => {
    const freshContexts: string[][] = [];
    const cumulativeContexts: string[][] = [];

    const freshLoop = new RalphLoop(
      {
        maxIterations: 2,
        qualityGates: ["typecheck", "lint", "test", "build"],
        completionSignal: "DONE",
        iterationTimeoutMs: 1_000,
        contextRefreshStrategy: "fresh"
      },
      async (_iteration, context) => {
        freshContexts.push(context.previousOutputs);
        return {
          output: "next",
          tokensUsed: 1,
          cost: 0,
          duration: 10
        };
      }
    );

    const cumulativeLoop = new RalphLoop(
      {
        maxIterations: 2,
        qualityGates: ["typecheck", "lint", "test", "build"],
        completionSignal: "DONE",
        iterationTimeoutMs: 1_000,
        contextRefreshStrategy: "cumulative"
      },
      async (_iteration, context) => {
        cumulativeContexts.push(context.previousOutputs);
        return {
          output: "next",
          tokensUsed: 1,
          cost: 0,
          duration: 10
        };
      }
    );

    await freshLoop.run("Prompt");
    await cumulativeLoop.run("Prompt");

    expect(freshContexts[0]).toEqual([]);
    expect(freshContexts[1]).toEqual([]);
    expect(cumulativeContexts[0]).toEqual([]);
    expect(cumulativeContexts[1]).toEqual(["next"]);
  });
});
