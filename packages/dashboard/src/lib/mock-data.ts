export type AgentProvider = "Claude" | "OpenCode" | "Codex";

export type AgentStatus = "active" | "idle" | "error";

export type TaskStatus = "pending" | "in-progress" | "completed" | "failed";

export type SessionStatus = "running" | "completed" | "failed";

export type MockAgent = {
  id: string;
  name: string;
  role: string;
  provider: AgentProvider;
  status: AgentStatus;
  activeTasks: number;
};

export type MockTask = {
  id: string;
  title: string;
  repo: string;
  assignee: string;
  status: TaskStatus;
  estimateHours: number;
};

export type MockSession = {
  id: string;
  agentName: string;
  objective: string;
  startedAt: string;
  status: SessionStatus;
};

export type MockCostPoint = {
  date: string;
  claude: number;
  opencode: number;
  codex: number;
  total: number;
};

export type MockCodeDiff = {
  file: string;
  before: string;
  after: string;
};

export const mockAgents: MockAgent[] = [
  {
    id: "agt-001",
    name: "Spec Planner",
    role: "Breaks product goals into implementation plans",
    provider: "Claude",
    status: "active",
    activeTasks: 2,
  },
  {
    id: "agt-002",
    name: "Patch Builder",
    role: "Implements code changes and migration patches",
    provider: "Codex",
    status: "active",
    activeTasks: 3,
  },
  {
    id: "agt-003",
    name: "Review Sentinel",
    role: "Performs code review and risk checks",
    provider: "OpenCode",
    status: "idle",
    activeTasks: 0,
  },
  {
    id: "agt-004",
    name: "Regression Hunter",
    role: "Runs automated tests and triages failures",
    provider: "Claude",
    status: "error",
    activeTasks: 1,
  },
  {
    id: "agt-005",
    name: "Prompt Optimizer",
    role: "Tunes prompts and evaluates response quality",
    provider: "OpenCode",
    status: "idle",
    activeTasks: 0,
  },
  {
    id: "agt-006",
    name: "Release Steward",
    role: "Prepares changelogs and release candidates",
    provider: "Codex",
    status: "active",
    activeTasks: 1,
  },
];

export const mockTasks: MockTask[] = [
  {
    id: "tsk-101",
    title: "Implement workspace snapshot export",
    repo: "packages/workspace",
    assignee: "Patch Builder",
    status: "in-progress",
    estimateHours: 6,
  },
  {
    id: "tsk-102",
    title: "Add provider failover strategy",
    repo: "packages/providers",
    assignee: "Spec Planner",
    status: "pending",
    estimateHours: 4,
  },
  {
    id: "tsk-103",
    title: "Stabilize CLI smoke tests",
    repo: "packages/cli",
    assignee: "Regression Hunter",
    status: "failed",
    estimateHours: 3,
  },
  {
    id: "tsk-104",
    title: "Optimize task orchestration queue",
    repo: "packages/orchestrator",
    assignee: "Patch Builder",
    status: "in-progress",
    estimateHours: 8,
  },
  {
    id: "tsk-105",
    title: "Draft release notes for v0.9",
    repo: "packages/core",
    assignee: "Release Steward",
    status: "completed",
    estimateHours: 2,
  },
  {
    id: "tsk-106",
    title: "Refactor session timeline rendering",
    repo: "packages/dashboard",
    assignee: "Spec Planner",
    status: "completed",
    estimateHours: 5,
  },
  {
    id: "tsk-107",
    title: "Benchmark token usage by provider",
    repo: "packages/verification",
    assignee: "Prompt Optimizer",
    status: "pending",
    estimateHours: 3,
  },
];

export const mockSessions: MockSession[] = [
  {
    id: "ses-3001",
    agentName: "Spec Planner",
    objective: "Plan dashboard alerting rollout",
    startedAt: "2026-04-04T08:00:00Z",
    status: "running",
  },
  {
    id: "ses-3002",
    agentName: "Patch Builder",
    objective: "Fix stale dependency graph cache",
    startedAt: "2026-04-04T07:35:00Z",
    status: "running",
  },
  {
    id: "ses-3003",
    agentName: "Review Sentinel",
    objective: "Review PR #248 in allcli/core",
    startedAt: "2026-04-04T06:20:00Z",
    status: "completed",
  },
  {
    id: "ses-3004",
    agentName: "Regression Hunter",
    objective: "Re-run orchestrator race-condition tests",
    startedAt: "2026-04-04T05:50:00Z",
    status: "failed",
  },
  {
    id: "ses-3005",
    agentName: "Release Steward",
    objective: "Prepare release candidate checklist",
    startedAt: "2026-04-04T05:10:00Z",
    status: "completed",
  },
];

export const mockCostData: MockCostPoint[] = [
  { date: "Mon", claude: 21.3, opencode: 12.2, codex: 15.4, total: 48.9 },
  { date: "Tue", claude: 18.1, opencode: 14.4, codex: 16.2, total: 48.7 },
  { date: "Wed", claude: 24.6, opencode: 13.1, codex: 14.5, total: 52.2 },
  { date: "Thu", claude: 19.7, opencode: 15.2, codex: 17.8, total: 52.7 },
  { date: "Fri", claude: 26.8, opencode: 12.8, codex: 18.4, total: 58.0 },
  { date: "Sat", claude: 17.9, opencode: 10.6, codex: 11.3, total: 39.8 },
  { date: "Sun", claude: 14.2, opencode: 8.1, codex: 9.6, total: 31.9 },
];

export const mockCodeDiff: MockCodeDiff = {
  file: "packages/orchestrator/src/scheduler.ts",
  before: `export function scheduleTask(task: Task) {
  queue.push(task)
  processQueue()
}`,
  after: `export function scheduleTask(task: Task) {
  queue.push(task)
  if (!isProcessing) {
    processQueue()
  }
}`,
};
