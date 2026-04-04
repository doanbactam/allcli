import { describe, expect, it } from "vitest";
import { AgentRouter } from "../src/agent-router.js";

describe("AgentRouter", () => {
  const router = new AgentRouter();

  it("routes 'Fix the login bug' to builder", () => {
    const route = router.route("Fix the login bug");
    expect(route.role).toBe("builder");
  });

  it("routes 'Review the auth module' to reviewer", () => {
    const route = router.route("Review the auth module");
    expect(route.role).toBe("reviewer");
  });

  it("routes 'Write tests for the API' to tester", () => {
    const route = router.route("Write tests for the API");
    expect(route.role).toBe("tester");
  });

  it("routes 'Plan the architecture' to planner", () => {
    const route = router.route("Plan the architecture");
    expect(route.role).toBe("planner");
  });

  it("routes random input to general", () => {
    const route = router.route("Do something random");
    expect(route.role).toBe("general");
    expect(route.confidence).toBe(0);
  });

  it("rankRoles returns all roles sorted by relevance", () => {
    const ranked = router.rankRoles("Plan, implement, and test a login flow");

    expect(ranked).toHaveLength(5);
    expect(ranked[0]?.role).toBe("planner");
    expect(ranked[1]?.role).toBe("builder");
    expect(ranked[2]?.role).toBe("tester");
    expect(ranked[4]?.role).toBe("general");

    const roles = ranked.map((item) => item.role);
    expect(new Set(roles).size).toBe(5);
  });
});
