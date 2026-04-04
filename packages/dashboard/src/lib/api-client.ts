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

// ── Fetch helpers ───────────────────────────────────────────────────────────

const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => fetchJson<ApiStatus>("/status"),
  sessions: () => fetchJson<ApiSession[]>("/sessions"),
  tasks: () => fetchJson<ApiTask[]>("/tasks"),
  worktrees: () => fetchJson<ApiWorktree[]>("/worktrees"),
  inbox: () => fetchJson<ApiInboxMessage[]>("/inbox"),
} as const;
