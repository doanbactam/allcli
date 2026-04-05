import { describe, expect, it } from "vitest";
import { applyRuntimeEvent, sortSessionsForDisplay, summarizeVerifySummary } from "../src/lib/runtime-ux.ts";
import type { ApiSession, ApiVerifySummary, WsEvent } from "../src/lib/api-client.ts";

describe("runtime-ux helpers", () => {
  it("applies websocket output and transition events to the selected runtime state", () => {
    const outputEvent: WsEvent = {
      type: "session.output",
      repoId: "repo-a",
      payload: {
        sessionId: "session-1",
        chunk: "alpha\n\nbeta\n"
      }
    };

    const afterOutput = applyRuntimeEvent(
      {
        logsBySession: {},
        selectedSessionId: null
      },
      outputEvent,
      { activeRepoId: "repo-a", limit: 4 }
    );

    expect(afterOutput.selectedSessionId).toBe("session-1");
    expect(afterOutput.logsBySession["repo-a:session-1"]).toEqual(["alpha", "beta"]);

    const transitionEvent: WsEvent = {
      type: "session.transition",
      repoId: "repo-a",
      payload: {
        sessionId: "session-1",
        from: "spawning",
        to: "working"
      }
    };

    const afterTransition = applyRuntimeEvent(afterOutput, transitionEvent, {
      activeRepoId: "repo-a",
      limit: 4
    });

    expect(afterTransition.logsBySession["repo-a:session-1"]).toEqual([
      "alpha",
      "beta",
      "[status] spawning -> working"
    ]);
  });

  it("adds terminal session details and enforces the log cap", () => {
    const updatedEvent: WsEvent = {
      type: "session.updated",
      repoId: "repo-b",
      payload: {
        record: {
          id: "session-2",
          task: "Verify repo",
          provider: "amp",
          status: "errored",
          createdAt: "2026-04-04T10:00:00.000Z",
          updatedAt: "2026-04-04T10:01:00.000Z",
          exitCode: 1,
          error: "Gate failed"
        }
      }
    };

    const next = applyRuntimeEvent(
      {
        logsBySession: {
          "repo-b:session-2": ["line-1", "line-2", "line-3"]
        },
        selectedSessionId: "session-9"
      },
      updatedEvent,
      { activeRepoId: "repo-b", limit: 4 }
    );

    expect(next.selectedSessionId).toBe("session-9");
    expect(next.logsBySession["repo-b:session-2"]).toEqual([
      "line-2",
      "line-3",
      "[session] errored (exit 1)",
      "[error] Gate failed"
    ]);
  });

  it("sorts the newest sessions first", () => {
    const sessions: ApiSession[] = [
      {
        id: "older",
        task: "Older",
        provider: "amp",
        status: "working",
        createdAt: "2026-04-04T10:00:00.000Z",
        updatedAt: "2026-04-04T10:01:00.000Z"
      },
      {
        id: "newer",
        task: "Newer",
        provider: "amp",
        status: "done",
        createdAt: "2026-04-04T10:02:00.000Z",
        updatedAt: "2026-04-04T10:03:00.000Z"
      }
    ];

    expect(sortSessionsForDisplay(sessions).map((session) => session.id)).toEqual(["newer", "older"]);
  });

  it("summarizes verify results for runtime cards", () => {
    const summary: ApiVerifySummary = {
      workspace: {
        rootPath: "C:/repo",
        mode: "default"
      },
      results: [
        { gate: "typecheck", passed: true, duration: 12 },
        { gate: "test", passed: false, duration: 48, output: "2 tests failed" }
      ],
      allPassed: false,
      totalDuration: 60
    };

    expect(summarizeVerifySummary(summary)).toEqual({
      label: "1 gate failed",
      tone: "danger",
      details: "Failed: test"
    });
  });
});
