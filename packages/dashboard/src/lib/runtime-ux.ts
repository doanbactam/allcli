import type { ApiSession, ApiVerifySummary, WsEvent } from "./api-client";

export interface RuntimeState {
  logsBySession: Record<string, string[]>;
  selectedSessionId: string | null;
}

interface ApplyRuntimeEventOptions {
  activeRepoId: string | null;
  limit?: number;
}

export function applyRuntimeEvent(
  state: RuntimeState,
  event: WsEvent,
  options: ApplyRuntimeEventOptions
): RuntimeState {
  const limit = options.limit ?? 400;
  const currentSelection = state.selectedSessionId;

  if (event.type === "session.output") {
    const lines = splitLogChunk(event.payload.chunk);
    if (lines.length === 0) {
      return maybeSelectSession(state, event.repoId, event.payload.sessionId, options.activeRepoId);
    }

    return {
      logsBySession: {
        ...state.logsBySession,
        [toSessionLogKey(event.repoId, event.payload.sessionId)]: appendLogLines(
          state.logsBySession[toSessionLogKey(event.repoId, event.payload.sessionId)] ?? [],
          lines,
          limit
        )
      },
      selectedSessionId:
        currentSelection ?? (event.repoId === options.activeRepoId ? event.payload.sessionId : currentSelection)
    };
  }

  if (event.type === "session.transition") {
    return {
      logsBySession: {
        ...state.logsBySession,
        [toSessionLogKey(event.repoId, event.payload.sessionId)]: appendLogLines(
          state.logsBySession[toSessionLogKey(event.repoId, event.payload.sessionId)] ?? [],
          [`[status] ${event.payload.from} -> ${event.payload.to}`],
          limit
        )
      },
      selectedSessionId:
        currentSelection ?? (event.repoId === options.activeRepoId ? event.payload.sessionId : currentSelection)
    };
  }

  const session = event.payload.record;
  const detailLines = buildSessionDetailLines(session);
  if (detailLines.length === 0) {
    return maybeSelectSession(state, event.repoId, session.id, options.activeRepoId);
  }

  return {
    logsBySession: {
      ...state.logsBySession,
      [toSessionLogKey(event.repoId, session.id)]: appendLogLines(
        state.logsBySession[toSessionLogKey(event.repoId, session.id)] ?? [],
        detailLines,
        limit
      )
    },
    selectedSessionId: currentSelection ?? (event.repoId === options.activeRepoId ? session.id : currentSelection)
  };
}

export function sortSessionsForDisplay(sessions: ApiSession[]): ApiSession[] {
  return [...sessions].sort((left, right) => {
    const updated = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updated !== 0) {
      return updated;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function summarizeVerifySummary(summary: ApiVerifySummary): {
  label: string;
  tone: "success" | "danger";
  details: string;
} {
  const failed = summary.results.filter((result) => !result.passed).map((result) => result.gate);
  if (failed.length === 0) {
    return {
      label: `${summary.results.length} gates passed`,
      tone: "success",
      details: `Completed in ${summary.totalDuration}ms`
    };
  }

  return {
    label: `${failed.length} gate${failed.length === 1 ? "" : "s"} failed`,
    tone: "danger",
    details: `Failed: ${failed.join(", ")}`
  };
}

function maybeSelectSession(
  state: RuntimeState,
  repoId: string,
  sessionId: string,
  activeRepoId: string | null
): RuntimeState {
  if (state.selectedSessionId || repoId !== activeRepoId) {
    return state;
  }

  return {
    ...state,
    selectedSessionId: sessionId
  };
}

function toSessionLogKey(repoId: string, sessionId: string): string {
  return `${repoId}:${sessionId}`;
}

function appendLogLines(existing: string[], incoming: string[], limit: number): string[] {
  return [...existing, ...incoming].slice(-limit);
}

function splitLogChunk(chunk: string): string[] {
  return chunk
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

function buildSessionDetailLines(session: ApiSession): string[] {
  const lines: string[] = [];
  if (session.exitCode !== undefined || isTerminalSessionStatus(session.status)) {
    lines.push(`[session] ${session.status}${session.exitCode !== undefined ? ` (exit ${session.exitCode})` : ""}`);
  }
  if (session.error) {
    lines.push(`[error] ${session.error}`);
  }
  return lines;
}

function isTerminalSessionStatus(status: ApiSession["status"]): boolean {
  return ["done", "errored", "killed", "approved", "merged"].includes(status);
}
