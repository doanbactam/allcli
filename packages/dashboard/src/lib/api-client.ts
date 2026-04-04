/**
 * API client for AllCLI dashboard.
 * In dev mode the Vite dev server proxies /api → http://localhost:3000.
 * In production the API server serves the dashboard static files directly.
 */

// ── Shared types matching server responses ──────────────────────────────────

export type ApiSessionStatus =
  | "idle"
  | "spawning"
  | "working"
  | "pr_open"
  | "ci_failed"
  | "review_pending"
  | "changes_requested"
  | "approved"
  | "mergeable"
  | "merged"
  | "cleanup"
  | "needs_input"
  | "stuck"
  | "errored"
  | "killed"
  | "done";

export interface ApiSession {
  id: string;
  task: string;
  provider: string;
  status: ApiSessionStatus;
  createdAt: string;
  updatedAt: string;
  pid?: number;
  exitCode?: number;
  error?: string;
}

export type ApiTaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed";

export interface ApiTask {
  id: string;
  title: string;
  description: string;
  status: ApiTaskStatus;
  priority: number;
  blockedBy: string[];
  assignedAgent?: string;
  worktreeId?: string;
  acceptanceCriteria: string[];
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
    tokensUsed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiWorktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  sessionId?: string;
  createdAt: string;
  status: "active" | "merged" | "stale";
}

export interface ApiInboxMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface ApiStatus {
  status: {
    total: number;
    spawning: number;
    working: number;
    pr_open: number;
    review_pending: number;
    done: number;
    errored: number;
    killed: number;
    stuck: number;
  };
  provider: string;
}

// ── WebSocket event types ───────────────────────────────────────────────────

export type WsEvent =
  | { type: "session.transition"; payload: { sessionId: string; from: ApiSessionStatus; to: ApiSessionStatus } }
  | { type: "session.updated"; payload: { record: ApiSession } }
  | { type: "session.output"; payload: { sessionId: string; chunk: string } };

// ── Mock data adapters ──────────────────────────────────────────────────────

import {
  mockSessions,
  mockTasks,
  mockAgents,
} from "./mock-data";

const mockApiStatus: ApiStatus = {
  status: {
    total: mockSessions.length,
    spawning: 1,
    working: mockSessions.filter((s) => s.status === "running").length,
    pr_open: 0,
    review_pending: 0,
    done: mockSessions.filter((s) => s.status === "completed").length,
    errored: mockSessions.filter((s) => s.status === "failed").length,
    killed: 0,
    stuck: 0,
  },
  provider: "claude",
};

const mockApiSessions: ApiSession[] = mockSessions.map((s, i) => ({
  id: s.id,
  task: s.objective,
  provider: mockAgents[i % mockAgents.length].provider.toLowerCase(),
  status: s.status === "running" ? "working" : s.status === "completed" ? "done" : "errored",
  createdAt: s.startedAt,
  updatedAt: s.startedAt,
}));

const mockApiTasks: ApiTask[] = mockTasks.map((t, i) => ({
  id: t.id,
  title: t.title,
  description: `${t.repo} — assigned to ${t.assignee}`,
  status: t.status === "in-progress" ? "in_progress" : t.status,
  priority: (i + 1) * 2,
  blockedBy: [] as string[],
  assignedAgent: t.assignee,
  acceptanceCriteria: [] as string[],
  createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
  updatedAt: new Date().toISOString(),
  result: {
    success: t.status === "completed" || t.status === "in-progress",
    output: `Completed: ${t.title}\nRepository: ${t.repo}\nAssignee: ${t.assignee}\nDuration: ${t.estimateHours}h estimated`,
    duration: t.estimateHours * 3600_000,
    tokensUsed: 12_500 + i * 3000,
  },
}));

const mockApiWorktrees: ApiWorktree[] = [
  { id: "wt-1", name: "feature/snapshot-export", path: "/tmp/wt-1", branch: "feature/snapshot-export", sessionId: "ses-3001", createdAt: new Date().toISOString(), status: "active" },
  { id: "wt-2", name: "fix/dependency-cache", path: "/tmp/wt-2", branch: "fix/dependency-cache", sessionId: "ses-3002", createdAt: new Date().toISOString(), status: "active" },
  { id: "wt-3", name: "chore/release-v09", path: "/tmp/wt-3", branch: "chore/release-v09", createdAt: new Date().toISOString(), status: "merged" },
];

const mockApiInbox: ApiInboxMessage[] = [
  { id: "msg-1", from: "Patch Builder", to: "Spec Planner", body: "Snapshot export PR ready for review", timestamp: new Date().toISOString(), read: false },
  { id: "msg-2", from: "Regression Hunter", to: "Patch Builder", body: "Smoke tests failed after latest changes", timestamp: new Date().toISOString(), read: true },
];

// ── Fetch helpers ───────────────────────────────────────────────────────────

const API_BASE = "/api";
const USE_MOCK = import.meta.env.DEV;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function withMockFallback<T>(fetcher: () => Promise<T>, mock: T): () => Promise<T> {
  return async () => {
    if (USE_MOCK) {
      try {
        return await fetcher();
      } catch {
        return mock;
      }
    }
    return fetcher();
  };
}

export const api = {
  status: withMockFallback(() => fetchJson<ApiStatus>("/status"), mockApiStatus),
  sessions: withMockFallback(() => fetchJson<ApiSession[]>("/sessions"), mockApiSessions),
  tasks: withMockFallback(() => fetchJson<ApiTask[]>("/tasks"), mockApiTasks),
  worktrees: withMockFallback(() => fetchJson<ApiWorktree[]>("/worktrees"), mockApiWorktrees),
  inbox: withMockFallback(() => fetchJson<ApiInboxMessage[]>("/inbox"), mockApiInbox),
} as const;
