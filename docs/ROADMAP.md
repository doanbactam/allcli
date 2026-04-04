# AllCLI — Roadmap Phát Triển

> **Ngày**: 2026-04-03  
> **Scope**: 4 phases, ~12 tuần total  
> **Approach**: MVP-first, incrementally add complexity  

---

## Philosophy

> "Bắt đầu đơn giản như Ralph, scale lên như ClawTeam khi cần."

Build theo thứ tự: **chạy được 1 agent** → **chạy được nhiều agents** → **chạy autonomous loop** → **web monitoring**.

> Ghi chú realism 2026: "autonomous loop" ở đây là **guardrailed autonomy** (không phải full autonomy mặc định).

---

## Phase 1: MVP — "Một Agent, Một Task" (4 tuần)

### Mục tiêu
Spawn 1 agent qua CLI, chạy task, xem output. Đây là foundation tất cả mọi thứ khác build trên.

### Packages build
1. `core` — Type system + plugin registry + event bus + config loader
2. `providers` — Base provider interface + Claude CLI adapter
3. `cli` — Commander commands + Ink status bar
4. `orchestrator` — Basic session lifecycle (spawn → working → done/errored)

### Deliverables

```
allcli run "Fix the login bug in auth.ts"
# → Spawns Claude agent
# → Streams output to terminal
# → Reports success/failure

allcli agent list
# → Shows active agents

allcli status
# → System overview
```

### Key files
```
packages/core/src/
├── types/
│   ├── session.ts          # SessionStatus, SessionEvent
│   ├── plugin.ts           # PluginSlot, Plugin interface
│   └── provider.ts         # Provider, SpawnConfig, ActivityState
├── plugin-registry.ts      # Register/load plugins
├── event-bus.ts            # Typed event emitter
└── config-loader.ts        # YAML config parser

packages/providers/src/
├── base-provider.ts        # Abstract class
├── claude-provider.ts      # Claude CLI adapter
└── process-manager.ts      # Child process lifecycle

packages/cli/src/
├── index.tsx               # Ink root component
├── commands/
│   ├── run.ts              # allcli run <task>
│   ├── agent.ts            # agent list/spawn/kill
│   └── status.ts           # System status
└── tui/
    ├── StatusBar.tsx       # Provider + model + context %
    └── LogViewer.tsx       # Streaming output

packages/orchestrator/src/
├── session-manager.ts      # CRUD for sessions
└── state-machine.ts        # Session state transitions
```

### Success Criteria
- [ ] `allcli run "task"` spawns Claude agent successfully
- [ ] Output streams to terminal in real-time
- [ ] Session status tracked (working/done/errored)
- [ ] `allcli agent list` shows active sessions
- [ ] Config loaded from `allcli.yaml`
- [ ] TypeScript compiles with zero errors
- [ ] `pnpm build` exits 0

### Tech decisions locked
- pnpm workspace monorepo
- TypeScript strict mode
- Commander.js + Ink for CLI
- YAML config format
- Event-driven architecture (typed EventEmitter)

---

## Phase 2: Skills & Quality (3 tuần)

### Mục tiêu
Agent có knowledge (skills), chạy được với quality gates, hỗ trợ multiple providers.

### Packages build
5. `skills` — Skill loader + trigger system + hooks
6. `verification` — Quality gates + LLM judge + cost tracking

### New providers
- `opencode-provider.ts` — OpenCode CLI adapter
- `codex-provider.ts` — Codex CLI adapter

### Deliverables

```
allcli run "Fix auth bug" --skill debugging
# → Auto-loads debugging skill
# → Runs with quality gates (typecheck + lint + test)

allcli skill list
# → Shows available skills

allcli run "Add user profile page" --provider opencode
# → Uses OpenCode provider instead of Claude

allcli verification check
# → Runs all quality gates
```

### Key files
```
packages/skills/src/
├── types.ts                # SkillManifest, HookEvent, Hook
├── skill-loader.ts         # YAML frontmatter + MD parser
├── skill-registry.ts       # Trigger-based auto-loading
├── hook-engine.ts          # PreToolUse/PostToolUse
└── skills/
    ├── debugging/SKILL.md
    ├── tdd/SKILL.md
    ├── code-review/SKILL.md
    └── frontend-ui-ux/SKILL.md

packages/verification/src/
├── quality-gate.ts         # Gate interface
├── gates/
│   ├── typecheck.ts
│   ├── lint.ts
│   ├── test.ts
│   └── build.ts
├── llm-judge.ts            # Non-deterministic QA
└── cost-tracker.ts         # Token + cost tracking
```

### Success Criteria
- [ ] Skills load from YAML+MD files
- [ ] Trigger-based auto-loading works (mention "debug" → loads debugging skill)
- [ ] PreToolUse/PostToolUse hooks fire correctly
- [ ] Quality gates run (typecheck, lint, test, build)
- [ ] LLM Judge evaluates subjective quality *(optional/experimental in Phase 2)*
- [ ] Cost tracking records token usage
- [ ] All 3 providers (Claude/OpenCode/Codex) functional
- [ ] `allcli run --provider opencode` works

---

## Phase 3: Multi-Agent & Workspace (3 tuần)

### Mục tiêu
Nhiều agents chạy song song trong isolated worktrees, coordinate qua inbox messaging.

### Packages build
7. `workspace` — Git worktree + task tracker + inbox + file manager

### Orchestrator additions
- `agent-router.ts` — Intent-based agent routing
- `task-decomposer.ts` — Auto-decompose tasks into subtasks
- `ralph-loop.ts` — Autonomous iteration engine

### Deliverables

```
allcli loop --prd prd.json
# → Ralph Loop: guardrailed autonomous iteration until complete
# → Fresh context per iteration
# → State persists via git + JSON

allcli workspace create feature-auth
# → Creates isolated git worktree

allcli task create "Add login page" --priority 1
allcli task create "Add signup page" --blocked-by task-1
allcli task decompose task-1
# → Auto-decomposes into subtasks

allcli agent spawn planner --task "Design auth system"
allcli agent spawn builder --task "Implement login"
# → Multiple agents in isolated worktrees
```

### Key files
```
packages/workspace/src/
├── worktree-manager.ts     # Git worktree CRUD
├── task-tracker.ts         # Dependency-aware task chains
├── file-manager.ts         # Read/write/search
└── inbox.ts                # Inter-agent messaging

packages/orchestrator/src/
├── agent-router.ts         # Intent → agent mapping
├── task-decomposer.ts      # Auto subtask generation
└── ralph-loop.ts           # Fresh-context iteration engine
```

### Success Criteria
- [ ] Git worktree creation/isolation works
- [ ] Multiple agents run in parallel without conflicts
- [ ] Task dependency chains resolve correctly
- [ ] Inbox messaging between agents works
- [ ] Ralph Loop runs autonomously for 10+ iterations
- [ ] PRD-driven completion detection works
- [ ] Auto-decomposition produces valid subtasks
- [ ] Agent router correctly classifies intents

---

## Phase 4: Dashboard & Polish (2 tuần)

### Mục tiêu
Web UI cho monitoring, code review, và configuration management.

### Packages build
8. `dashboard` — Next.js + shadcn + Monaco Editor

### Deliverables

```
allcli dashboard
# → Starts Next.js web UI on localhost:3000
# → Real-time agent monitoring
# → Monaco code editor for review
# → Kanban task board
# → Cost dashboard
```

### Key files
```
packages/dashboard/
├── app/
│   ├── page.tsx            # Dashboard home
│   ├── agents/page.tsx     # Agent monitoring
│   ├── tasks/page.tsx      # Kanban board
│   ├── review/page.tsx     # Code review (Monaco)
│   ├── costs/page.tsx      # Cost tracking
│   └── api/
│       ├── ws/route.ts     # WebSocket endpoint
│       └── agents/route.ts # REST API
├── components/
│   ├── AgentCard.tsx       # Agent status card
│   ├── TaskBoard.tsx       # Kanban view
│   ├── CodeDiff.tsx        # Monaco diff editor
│   └── CostChart.tsx       # Token/cost chart
└── lib/
    ├── ws-client.ts        # WebSocket hook
    └── api-client.ts       # REST client
```

### Success Criteria
- [ ] Dashboard starts and shows agent status
- [ ] WebSocket streams real-time updates
- [ ] Monaco Editor renders code diffs
- [ ] Kanban board shows task states
- [ ] Cost tracking displays token usage charts
- [ ] Responsive design works on mobile

---

## Timeline Visualization

```
Week  1  2  3  4  5  6  7  8  9 10 11 12
      ├──────────┤                          Phase 1: MVP
                  ├─────────┤               Phase 2: Skills+QA
                              ├─────────┤   Phase 3: Multi-Agent
                                          ├──────┤ Phase 4: Dashboard
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| CLI providers thay đổi API | Medium | High | Adapter pattern isolates changes |
| Token costs cao | High | Medium | Cost tracking + budgets từ Phase 2 |
| Agents stuck in loops | High | Medium | Ralph Loop max iterations + stuck detection |
| Context window limits | Medium | High | Fresh context strategy + context budgeting |
| Multi-agent conflicts | Medium | High | Worktree isolation từ Phase 3 |
| Quality gate false negatives | Medium | Medium | LLM Judge + deterministic gates combined |
| Dashboard WebSocket complexity | Low | Low | Start with polling, upgrade to WS |

---

## MVP Definition of Done

Phase 1 complete khi:

1. `pnpm install` runs clean
2. `pnpm build` exits 0
3. `allcli run "create a hello world function"` spawns Claude agent
4. Agent output streams to terminal
5. `allcli agent list` shows the running agent
6. `allcli status` shows system state
7. `allcli.yaml` loaded and respected
8. TypeScript strict mode, zero errors
9. Basic tests for core types and provider interface
10. README.md with setup instructions

---

## Phase Exit Gates (No-Skip Policy)

> Mỗi phase chỉ được chuyển tiếp khi pass toàn bộ gate của phase hiện tại.

### Exit Gate: Phase 1 → Phase 2
- [ ] Claude adapter contract tests pass end-to-end
- [ ] OpenCode/Codex capability matrix + contract fixtures đã được định nghĩa (enforce test ở Phase 2)
- [ ] Session lifecycle observable (spawn/working/done/errored)
- [ ] CLI command set ổn định: `run`, `agent list`, `agent kill`, `status`

### Exit Gate: Phase 2 → Phase 3
- [ ] Skill loading deterministic (YAML+MD) và hook engine ổn định
- [ ] Deterministic quality gates pass ổn định trên CI
- [ ] Budget/cost guardrails hoạt động (session/project limits)

### Exit Gate: Phase 3 → Phase 4
- [ ] Multi-agent worktree isolation không conflict trong test kịch bản song song
- [ ] Escalation policy cho stuck/retry/approval hoạt động
- [ ] Ralph loop đạt tỷ lệ hoàn thành ổn định trên task well-defined

### Exit Gate: Phase 4 → Production Hardening
- [ ] Dashboard consume đúng API contracts đã ổn định
- [ ] Performance baseline của dashboard đạt mục tiêu nội bộ
- [ ] Docs/ADR đồng bộ với implementation thực tế
