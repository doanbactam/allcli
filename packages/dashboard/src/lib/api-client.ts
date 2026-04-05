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
  repoId?: string;
}

export interface ApiRepoSummary {
  id: string;
  name: string;
  rootPath: string;
  isDefault: boolean;
  provider: string;
  totalSessions: number;
  activeSessions: number;
  erroredSessions: number;
  taskCount: number;
  addedAt: string;
  lastOpenedAt: string;
}

export interface ApiFileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
}

export interface ApiFileDirectorySnapshot {
  path: string;
  entries: ApiFileEntry[];
}

export interface ApiFilePreview {
  path: string;
  content: string;
  isBinary: boolean;
  truncated: boolean;
  size: number;
}

export interface ApiVerifySummary {
  workspace: {
    rootPath: string;
    mode: "default" | "worktree";
    worktreeId?: string;
  };
  results: Array<{
    passed: boolean;
    gate: "typecheck" | "lint" | "test" | "build";
    output?: string;
    duration: number;
  }>;
  allPassed: boolean;
  totalDuration: number;
}

// ── WebSocket event types ───────────────────────────────────────────────────

export type WsEvent =
  | { type: "session.transition"; repoId: string; payload: { sessionId: string; from: ApiSessionStatus; to: ApiSessionStatus } }
  | { type: "session.updated"; repoId: string; payload: { record: ApiSession } }
  | { type: "session.output"; repoId: string; payload: { sessionId: string; chunk: string } };

// ── Fetch helpers ───────────────────────────────────────────────────────────

const API_BASE = "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export const api = {
  status: () => fetchJson<ApiStatus>("/status"),
  sessions: () => fetchJson<ApiSession[]>("/sessions"),
  tasks: () => fetchJson<ApiTask[]>("/tasks"),
  worktrees: () => fetchJson<ApiWorktree[]>("/worktrees"),
  inbox: () => fetchJson<ApiInboxMessage[]>("/inbox"),
  repos: () => fetchJson<ApiRepoSummary[]>("/repos"),
  addRepo: (path: string) =>
    requestJson<ApiRepoSummary>("/repos", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  removeRepo: (repoId: string) =>
    requestJson<{ ok: true }>(`/repos/${repoId}`, {
      method: "DELETE",
    }),
  repoStatus: (repoId: string) => fetchJson<ApiStatus>(`/repos/${repoId}/status`),
  repoSessions: (repoId: string) => fetchJson<ApiSession[]>(`/repos/${repoId}/sessions`),
  killRepoSession: (repoId: string, sessionId: string) =>
    requestJson<{ ok: true }>(`/repos/${repoId}/sessions/${encodeURIComponent(sessionId)}/kill`, {
      method: "POST",
    }),
  repoTasks: (repoId: string) => fetchJson<ApiTask[]>(`/repos/${repoId}/tasks`),
  createRepoTask: (
    repoId: string,
    payload: { title: string; description?: string; priority?: number; blockedBy?: string[]; acceptanceCriteria?: string[] }
  ) =>
    requestJson<ApiTask>(`/repos/${repoId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  repoWorktrees: (repoId: string) => fetchJson<ApiWorktree[]>(`/repos/${repoId}/worktrees`),
  createRepoWorktree: (repoId: string, name: string) =>
    requestJson<ApiWorktree>(`/repos/${repoId}/worktrees`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  repoFiles: (repoId: string, path: string) =>
    fetchJson<ApiFileDirectorySnapshot>(`/repos/${repoId}/files?path=${encodeURIComponent(path)}`),
  repoFile: (repoId: string, path: string) =>
    fetchJson<ApiFilePreview>(`/repos/${repoId}/file?path=${encodeURIComponent(path)}`),
  runRepoPrompt: (repoId: string, task: string) =>
    requestJson<ApiSession>(`/repos/${repoId}/run`, {
      method: "POST",
      body: JSON.stringify({ task }),
    }),
  spawnRepoAgent: (repoId: string, payload: { role: string; task?: string }) =>
    requestJson<ApiSession>(`/repos/${repoId}/agent`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyRepo: (repoId: string) =>
    requestJson<ApiVerifySummary>(`/repos/${repoId}/verify`, {
      method: "POST",
    }),
} as const;
