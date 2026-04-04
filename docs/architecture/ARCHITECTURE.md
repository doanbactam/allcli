# AllCLI — Kiến Trúc Hệ Thống

> **Phiên bản**: v0.1.0-draft  
> **Ngày**: 2026-04-03  
> **Trạng thái**: Thiết kế (chưa implement)  
> **Ngôn ngữ**: 100% TypeScript  
> **Package Manager**: pnpm  
> **Loại**: pnpm Monorepo  

---

## 1. Tầm Nhìn

**AllCLI** là nền tảng tự động hóa phát triển sản phẩm bằng AI từ A-Z. Hệ thống kết hợp sức mạnh của nhiều CLI AI providers (Claude CLI, OpenCode CLI, Codex CLI) qua kiến trúc plugin mở rộng, cho phép:

- **Có người**: Human-in-the-loop cho planning, review, approval
- **Không người (guardrailed)**: Autonomous execution cho well-defined coding/testing tasks theo phase gates
- **Hybrid**: Tự động nhưng escalate khi gặp vấn đề

### Mục tiêu thực tế (April 2026)

| Loại task | Tỷ lệ thành công kỳ vọng | Autonomous? |
|-----------|--------------------------|-------------|
| Bug fix (well-defined) | 70-85% | ✅ Autonomous |
| Test writing | 80-85% | ✅ Autonomous |
| Boilerplate generation | 90%+ | ✅ Autonomous |
| Small features (defined) | 60-70% | ⚠️ Semi-auto |
| Refactoring | 40-50% | ⚠️ Human review |
| Architecture decisions | 15-25% | ❌ Human-led |
| Ambiguous requirements | 15-35% | ❌ Human-led |

---

## 2. Kiến Trúc Tổng Thể

### 2.0. Autonomy Modes by Phase (2026 Realism)

| Phase | Autonomy Mode | Mô tả |
|---|---|---|
| Phase 1 | Assisted | Human-triggered command execution, deterministic validation first |
| Phase 2 | Semi-autonomous | Single-agent autonomy with strict quality and budget gates |
| Phase 3 | Guardrailed multi-agent | Parallel agents qua worktree isolation + escalation policies |
| Phase 4 | UI/Monitoring expansion | Mở rộng monitoring và UX, không tăng autonomy mặc định |

> Chính sách: MVP **không** theo đuổi full autonomy; full autonomy chỉ được cân nhắc sau khi phase gates ổn định.

### 2.1. Layer Architecture (5 Layers)

```
┌─────────────────────────────────────────────────┐
│ Layer 1: USER INTERFACE                        │
│ CLI (Ink) + Dashboard (Next.js) + Monaco       │
├─────────────────────────────────────────────────┤
│ Layer 2: ORCHESTRATION                         │
│ State Machine + Agent Router + Task Decomposer │
├─────────────────────────────────────────────────┤
│ Layer 3: AGENT EXECUTION                       │
│ Provider Adapters + Skill System + Hooks       │
├─────────────────────────────────────────────────┤
│ Layer 4: WORKSPACE                             │
│ Git Worktrees + Task Tracker + File Manager    │
├─────────────────────────────────────────────────┤
│ Layer 5: VERIFICATION & OBSERVABILITY          │
│ Quality Gates + LLM Judge + Cost Tracking      │
└─────────────────────────────────────────────────┘
```

### 2.2. Package Structure (8 Packages)

| # | Package | Trách nhiệm | Size ước tính | Dependencies |
|---|---------|-------------|---------------|--------------|
| 1 | `core` | Type system, plugin registry, event bus, config | ~3000 LOC | None |
| 2 | `cli` | Ink TUI, Commander commands, output formatting | ~2500 LOC | core |
| 3 | `orchestrator` | State machine, task decomposer, agent router, ralph loop | ~4000 LOC | core *(skills integration từ Phase 2)* |
| 4 | `providers` | Claude/OpenCode/Codex adapter interface + implementations | ~2000 LOC | core |
| 5 | `skills` | Skill loader (YAML+MD), trigger registry, hook system | ~1500 LOC | core |
| 6 | `workspace` | Git worktree, task tracking, file ops, inbox messaging | ~2500 LOC | core |
| 7 | `verification` | Quality gates, LLM judge, cost tracker, attribution | ~2000 LOC | core, providers *(workspace integration from Phase 3)* |
| 8 | `dashboard` | Next.js web UI + Monaco Editor + WebSocket monitoring | ~3000 LOC | core, orchestrator |

**Tổng**: ~20,500 LOC TypeScript

---

## 3. Chi Tiết Package

### 3.1. `packages/core` — Foundation

```typescript
// core/types/session.ts
export type SessionStatus =
  | "idle" | "spawning" | "working"
  | "pr_open" | "ci_failed" | "review_pending"
  | "changes_requested" | "approved" | "mergeable"
  | "merged" | "cleanup" | "needs_input"
  | "stuck" | "errored" | "killed" | "done";

export type SessionEvent =
  | "session.spawned" | "session.working" | "session.exited"
  | "session.killed" | "session.idle" | "session.stuck"
  | "session.needs_input" | "session.errored"
  | "pr.created" | "pr.updated" | "pr.merged" | "pr.closed"
  | "ci.passing" | "ci.failing"
  | "review.pending" | "review.approved" | "review.changes_requested"
  | "merge.ready" | "merge.conflicts" | "merge.completed";

// core/types/plugin.ts
export type PluginSlot =
  | "runtime"    // tmux, docker, process
  | "agent"      // claude, opencode, codex
  | "tool"       // filesystem, web, mcp connectors
  | "workspace"  // worktree, clone
  | "tracker"    // github, linear, jira
  | "scm"        // github, gitlab
  | "notifier"   // slack, webhook, desktop
  | "terminal";  // iterm2, web, ink

export interface Plugin<TConfig = unknown> {
  readonly name: string;
  readonly slot: PluginSlot;
  readonly version: string;
  register(registry: PluginRegistry): void;
  configure(config: TConfig): void;
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
}

// core/types/provider.ts
export interface Provider {
  readonly name: string;
  readonly supportedModels: readonly string[];
  
  spawn(config: SpawnConfig): Promise<ProviderHandle>;
  sendMessage(handle: ProviderHandle, message: string): Promise<void>;
  getOutput(handle: ProviderHandle, lines?: number): Promise<string>;
  isAlive(handle: ProviderHandle): Promise<boolean>;
  getActivityState(handle: ProviderHandle): Promise<ActivityState | null>;
  destroy(handle: ProviderHandle): Promise<void>;
}

export interface SpawnConfig {
  readonly prompt: string;
  readonly model?: string;
  readonly cwd: string;
  readonly dangerouslySkipPermissions?: boolean;
  readonly outputFormat?: "text" | "stream-json";
}

export interface ActivityState {
  status: "idle" | "working" | "waiting_input";
  lastActivityAt: Date;
  toolCallsCount: number;
}
```

### 3.2. `packages/cli` — User Interface

```typescript
// Cấu trúc CLI commands
allcli                          # Root
├── init                        # Khởi tạo project config
├── agent                       # Agent management
│   ├── list                    # List active agents
│   ├── spawn <task>            # Spawn agent cho task
│   ├── kill <session-id>       # Kill agent session
│   └── send <session-id> <msg> # Gửi message đến agent
├── task                        # Task management
│   ├── list                    # List tasks
│   ├── create <description>    # Create task
│   ├── decompose <task-id>     # Auto-decompose task
│   └── status [task-id]        # Show task status
├── workspace                   # Workspace management
│   ├── list                    # List worktrees
│   ├── create <name>           # Create isolated worktree
│   └── cleanup                 # Cleanup merged worktrees
├── skill                       # Skill management
│   ├── list                    # List available skills
│   ├── install <name>          # Install skill
│   └── trigger <name>          # Manually trigger skill
├── run <task-description>      # Quick: spawn + run + monitor
├── loop <prd-path>             # Ralph Loop: autonomous iteration
├── verification                # Quality checks
│   └── check                   # Run quality gates
├── dashboard                   # Start web dashboard
├── status                      # System overview
└── config                      # Configuration management
    ├── show                    # Show current config
    ├── set <key> <value>       # Set config value
    └── provider                # Provider configuration
        ├── list                # List providers
        └── test <name>         # Test provider connection
```

**Ink Components**:
```typescript
// cli/tui/components/
├── App.tsx                     # Root Ink component
├── StatusBar.tsx               # Provider, model, context %
├── AgentList.tsx               # Active agents overview
├── TaskBoard.tsx               # Kanban-style task view
├── LogViewer.tsx               # Streaming agent output
├── DiffViewer.tsx              # Terminal diff display
└── ChatInput.tsx               # Interactive prompt input
```

### 3.3. `packages/orchestrator` — The Brain

```typescript
// orchestrator/state-machine.ts
export class SessionStateMachine {
  private transitions: Map<SessionStatus, Set<SessionStatus>>;
  
  constructor() {
    // Định nghĩa valid transitions
    this.transitions = new Map([
      ["idle", new Set(["spawning"])],
      ["spawning", new Set(["working", "errored"])],
      ["working", new Set(["pr_open", "needs_input", "stuck", "errored", "idle", "done"])],
      ["pr_open", new Set(["ci_failed", "review_pending", "merged", "errored"])],
      ["ci_failed", new Set(["working", "changes_requested"])],
      ["review_pending", new Set(["approved", "changes_requested"])],
      ["changes_requested", new Set(["working"])],
      ["approved", new Set(["mergeable"])],
      ["mergeable", new Set(["merged", "cleanup"])],
      ["merged", new Set(["cleanup", "done"])],
      ["cleanup", new Set(["done"])],
      ["needs_input", new Set(["working", "killed"])],
      ["stuck", new Set(["working", "killed"])],
      ["errored", new Set(["spawning", "killed"])],
      ["killed", new Set(["idle"])],
    ]);
  }
  
  canTransition(from: SessionStatus, to: SessionStatus): boolean {
    return this.transitions.get(from)?.has(to) ?? false;
  }
}

// orchestrator/ralph-loop.ts
export interface RalphLoopConfig {
  maxIterations: number;           // Default: 50
  prdPath: string;                 // Path to PRD JSON
  qualityGates: QualityGate[];     // typecheck, test, lint, build
  completionSignal: string;        // Default: "<promise>COMPLETE</promise>"
  iterationTimeoutMs: number;      // Default: 600000 (10 min)
  contextRefreshStrategy: "fresh" | "cumulative";  // Default: "fresh"
}

export interface RalphLoopResult {
  completed: boolean;
  iterations: number;
  totalTokensUsed: number;
  totalCost: number;
  storiesCompleted: string[];
  storiesFailed: string[];
  learnings: string[];             // From progress.txt
}
```

### 3.4. `packages/providers` — CLI Adapters

```typescript
// providers/base-provider.ts
export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  abstract readonly supportedModels: readonly string[];
  
  abstract spawn(config: SpawnConfig): Promise<ProviderHandle>;
  abstract sendMessage(handle: ProviderHandle, message: string): Promise<void>;
  abstract getOutput(handle: ProviderHandle, lines?: number): Promise<string>;
  abstract isAlive(handle: ProviderHandle): Promise<boolean>;
  abstract getActivityState(handle: ProviderHandle): Promise<ActivityState | null>;
  abstract destroy(handle: ProviderHandle): Promise<void>;
}

// providers/claude-provider.ts
export class ClaudeProvider extends BaseProvider {
  readonly name = "claude";
  readonly supportedModels = ["opus", "sonnet", "haiku"] as const;
  
  async spawn(config: SpawnConfig): Promise<ProviderHandle> {
    const args = [
      "--dangerously-skip-permissions",
      "--output-format", config.outputFormat ?? "stream-json",
    ];
    if (config.model) args.push("--model", config.model);
    
    // Spawn claude CLI process
    return spawnProcess("claude", args, { cwd: config.cwd });
  }
}

// providers/opencode-provider.ts
export class OpenCodeProvider extends BaseProvider {
  readonly name = "opencode";
  readonly supportedModels = ["gpt-5", "gpt-5-mini", "claude-opus-4"] as const;
  
  async spawn(config: SpawnConfig): Promise<ProviderHandle> {
    // OpenCode CLI adapter
    return spawnProcess("opencode", ["--non-interactive"], { cwd: config.cwd });
  }
}

// providers/codex-provider.ts
export class CodexProvider extends BaseProvider {
  readonly name = "codex";
  readonly supportedModels = ["o3", "o4-mini"] as const;
  
  async spawn(config: SpawnConfig): Promise<ProviderHandle> {
    // Codex CLI adapter  
    return spawnProcess("codex", ["--auto-approve"], { cwd: config.cwd });
  }
}
```

### 3.5. `packages/skills` — Knowledge System

```typescript
// skills/types.ts
export interface SkillManifest {
  name: string;
  description: string;
  triggers: string[];            // Keywords that auto-load this skill
  category: SkillCategory;
  cost: "free" | "cheap" | "expensive";
  scope: "project" | "user" | "builtin";
}

export type SkillCategory =
  | "visual-engineering"   // Frontend, UI/UX
  | "ultrabrain"          // Hard logic, architecture
  | "deep"                // Autonomous research
  | "quick"               // Single-file changes
  | "writing"             // Documentation
  | "artistry"            // Creative problem-solving
  | "debugging"           // Bug investigation
  | "testing"             // Test writing, TDD
  | "devops";             // CI/CD, deployment

// Skill file format (skills/frontend-ui-ux/SKILL.md):
// ---
// name: frontend-ui-ux
// description: Designer-turned-developer for stunning UI/UX
// triggers: ["ui", "css", "component", "layout", "styling"]
// category: visual-engineering
// cost: cheap
// ---
// 
// ## When to Use
// Building React components, CSS utilities, styling...
// 
// ## Instructions
// [Detailed skill instructions]

// skills/hook-types.ts
export type HookEvent =
  | "PreToolUse"     // Before tool execution
  | "PostToolUse"    // After tool execution  
  | "SessionStart"   // Agent session starts
  | "SessionEnd"     // Agent session ends
  | "FileSave"       // File saved
  | "PreCommit"      // Before git commit
  | "PostCommit"     // After git commit
  | "QualityGate";   // Quality check point

export interface Hook {
  event: HookEvent;
  handler: HookHandler;
  match?: {
    pattern: string;
    flags?: string[];
  };
}

export type HookHandler = (context: HookContext) => Promise<HookResult>;

export interface HookContext {
  event: HookEvent;
  tool?: string;
  filePath?: string;
  sessionId: string;
  agentName: string;
}

export interface HookResult {
  allowed: boolean;
  modified?: unknown;
  reason?: string;
}
```

### 3.6. `packages/workspace` — Environment

```typescript
// workspace/worktree-manager.ts
export interface WorktreeManager {
  create(options: CreateWorktreeOptions): Promise<Worktree>;
  list(): Promise<Worktree[]>;
  remove(worktreeId: string): Promise<void>;
  cleanup(options?: { dryRun?: boolean }): Promise<CleanupResult>;
}

export interface CreateWorktreeOptions {
  name: string;
  branch?: string;
  baseBranch?: string;    // Default: "main"
  isolated: boolean;      // Create independent worktree
}

export interface Worktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  sessionId?: string;
  createdAt: Date;
  status: "active" | "merged" | "stale";
}

// workspace/task-tracker.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked" | "failed";
  priority: number;
  blockedBy: string[];          // Task IDs
  assignedAgent?: string;
  worktreeId?: string;
  acceptanceCriteria: string[];
  result?: TaskResult;
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  tokensUsed: number;
}

// workspace/inbox.ts (Inter-agent messaging, inspired by ClawTeam)
export interface Inbox {
  send(from: string, to: string, message: string): Promise<void>;
  receive(agentName: string): Promise<InboxMessage[]>;
  peek(agentName: string): Promise<InboxMessage[]>;
  broadcast(from: string, message: string): Promise<void>;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  read: boolean;
}
```

### 3.7. `packages/verification` — Quality

```typescript
// verification/quality-gate.ts
export interface ExecutionWorkspace {
  rootPath: string;
  mode: "default" | "worktree";
  worktreeId?: string;
}

export interface QualityGate {
  name: string;
  type: "deterministic" | "non-deterministic";
  check(workspace: ExecutionWorkspace): Promise<QualityGateResult>;
}

export interface QualityGateResult {
  passed: boolean;
  gate: string;
  output?: string;
  duration: number;
}

// Deterministic gates
export class TypeCheckGate implements QualityGate { /* tsc --noEmit */ }
export class LintGate implements QualityGate { /* eslint */ }
export class TestGate implements QualityGate { /* vitest/jest */ }
export class BuildGate implements QualityGate { /* tsc build */ }

// Non-deterministic gates (LLM-as-Judge)
export class LLMJudgeGate implements QualityGate {
  constructor(
    private criteria: string,
    private model: "fast" | "smart" = "smart"
  ) {}
  
  async check(workspace: ExecutionWorkspace): Promise<QualityGateResult> {
    // Use fast model (Gemini Flash) or smart model (GPT-4.1)
    // for subjective quality assessment
  }
}

// verification/cost-tracker.ts
export interface CostTracker {
  getSessionCost(sessionId: string): CostReport;
  getProjectCost(projectId: string): CostReport;
  checkBudget(sessionId: string): BudgetStatus;
}

export interface CostReport {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
  breakdown: ModelCostBreakdown[];
}

export interface BudgetStatus {
  withinBudget: boolean;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}
```

### 3.8. `packages/dashboard` — Web UI

```typescript
// dashboard/ Tech stack
// - Next.js 15 (App Router)
// - shadcn/ui components
// - Monaco Editor for code viewing
// - WebSocket for real-time updates

// Dashboard features:
// 1. Agent monitoring (real-time status, output streaming)
// 2. Task board (Kanban view)
// 3. Code review (Monaco diff editor)
// 4. Cost dashboard (token usage, spend tracking)
// 5. Session history (past runs, results)
// 6. Configuration management (provider setup, skill management)
```

---

## 4. Configuration

### 4.1. `allcli.yaml` — Project Config

```yaml
# allcli.yaml - Root config file
version: "1"

project:
  name: my-project
  language: typescript

providers:
  default: claude
  claude:
    model: sonnet
    dangerous: true        # --dangerously-skip-permissions
    outputFormat: stream-json
  opencode:
    model: gpt-5
  codex:
    model: o3

orchestrator:
  maxIterations: 50
  iterationTimeoutMs: 600000
  contextRefresh: fresh    # fresh | cumulative
  decomposer:
    enabled: true
    maxDepth: 3
    model: sonnet
    requireApproval: true

workspace:
  baseBranch: main
  isolation: worktree      # worktree | clone
  autoCleanup: true

verification:
  approvalMode: smart       # manual | smart | off
  gates:
    - typecheck
    - lint
    - test
    - build
  llmJudge:
    enabled: true
    model: fast            # fast | smart
  costLimit:
    perSession: 10.00      # USD
    perProject: 100.00     # USD

persistence:
  engine: sqlite           # sqlite | postgres
  path: .allcli/state.db
  retentionDays: 30

agents:
  - name: planner
    provider: claude
    model: opus
    skills: [writing-plans, brainstorming]
  - name: builder
    provider: claude
    model: sonnet
    skills: [executing-plans, tdd]
  - name: reviewer
    provider: opencode
    model: gpt-5
    skills: [code-review, verification]

notifier:
  type: webhook
  url: https://hooks.slack.com/...
  events: [session.stuck, session.needs_input, ci.failing]
```

---

## 5. Key Design Decisions

### 5.1. Tại sao 8 packages, không phải 12?

Gộp lại theo high cohesion:
- `core` + `context` → `core` (context là core concern)
- `skills` + `hooks` → `skills` (hooks thuộc skill lifecycle)
- `workspace` + `tracker` → `workspace` (tracking thuộc workspace)
- `verification` + `observability` → `verification` (observability = verification concern)

### 5.2. Tại sao Ink + Commander?

- **Commander.js**: Argument parsing, subcommands, help generation — proven, stable
- **Ink**: Rich terminal UI (React-based), phù hợp cho status bars, log streaming, kanban views
- **Kết hợp**: Commander parse args → Ink render interactive UI
- NanoCoder, nhiều CLI tools AI đều dùng pattern này

### 5.3. Tại sao Ralph Loop + Swarm hybrid?

- **Ralph Loop** cho single-task autonomous: fresh context, state via git+JSON, proven pattern
- **Swarm (ClawTeam)** cho multi-agent coordination: inbox messaging, dependency chains
- **Hybrid**: Mỗi agent trong swarm chạy Ralph Loop riêng, coordinator quản lý inter-agent messaging

### 5.4. Tại sao YAML frontmatter cho Skills?

- ECC (156 skills) proved pattern works at scale
- Dễ đọc, dễ viết, dễ review trong git
- Trigger-based auto-loading đơn giản
- Không cần database cho skills

### 5.5. Xử lý "Last 30% Problem"

| Chiến lược | Khi nào dùng |
|-----------|-------------|
| **Human escalation** | Agent stuck 2+ iterations, CI fails 3+ times |
| **Model upgrade** | Sonnet fails → retry with Opus |
| **Task decomposition** | Complex task → split into smaller pieces |
| **Context injection** | Agent lacks context → inject AGENTS.md + relevant files |
| **LLM Judge feedback** | Quality gate fails → feed judge feedback back to agent |

---

## 6. Nguồn Tham Khảo Thiết Kế

| Pattern | Nguồn | Điểm mượn |
|---------|-------|-----------|
| 8-slot plugin system | Agent-Orchestrator (ComposioHQ) | Plugin architecture |
| Fresh context loop | Ralph Loop (snarktank/ghuntley) | Iteration pattern |
| 16-state session machine (AllCLI profile) | Agent-Orchestrator inspiration | State management |
| YAML+MD skills | ECC (everything-claude-code) | Skill format |
| Two-stage review | Superpowers (obra) | Quality process |
| Inbox messaging | ClawTeam (HKUDS) | Agent communication |
| Intent gate routing | oh-my-openagent | Request classification |
| Worktree isolation | Superset + ClawTeam | Workspace management |
| LLM-as-Judge | Ralph Playbook | Non-deterministic verification |
| Smart approval | Hermes-Agent | Security gating |
| Ink TUI | NanoCoder | Terminal UI |
| Monaco embedding | Monaco Editor | Code viewing/editing |
