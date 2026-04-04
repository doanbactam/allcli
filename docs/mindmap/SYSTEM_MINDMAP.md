# AllCLI — System Mindmap

> Unified AI Development Automation Platform  
> Ngày thiết kế: 2026-04-03  
> Loại dự án: Greenfield | 100% TypeScript | pnpm Monorepo

---

## 🗺️ System Overview Mindmap

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ALLCLI — AI DEV AUTOMATION                        ║
║                    "Tự động hóa xây dựng sản phẩm từ A-Z"                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

                              ┌─────────────┐
                              │   ALLCLI    │
                              │  System Core│
                              └──────┬──────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
   ┌──────┴──────┐          ┌───────┴───────┐         ┌───────┴───────┐
   │  CLI LAYER  │          │ ORCHESTRATION │         │   PLUGINS     │
   │ (User I/O)  │          │  (Brain)      │         │  (Extensible) │
   └──────┬──────┘          └───────┬───────┘         └───────┬───────┘
          │                         │                         │
    ┌─────┼─────┐          ┌───────┼───────┐          ┌──────┼──────┐
    │     │     │          │       │       │          │      │      │
  ┌─┴─┐┌─┴─┐┌─┴─┐      ┌─┴─┐  ┌──┴──┐  ┌─┴─┐    ┌──┴──┐┌──┴──┐┌──┴──┐
  │Ink││Cmd││Mon│      │Rou│  │Life │  │Task│    │Agent││Tool ││Track│
  │TUI││r  ││aco│      │ter│  │cycle│  │Dec │    │Slot ││Slot ││/Notif│
  └───┘└───┘└───┘      └───┘  └─────┘  └────┘    └─────┘└─────┘└─────┘
```

---

## 📦 Package Architecture (8 Packages)

```
allcli/
├── packages/
│   │
│   ├── 1. core/                    # Nền tảng hệ thống
│   │   ├── types/                  # TypeScript interfaces cho toàn hệ thống
│   │   ├── plugin-registry/        # Plugin load/unload lifecycle
│   │   ├── event-bus/              # Event-driven communication
│   │   └── config/                 # YAML/JSON config loader
│   │
│   ├── 2. cli/                     # Giao diện người dùng
│   │   ├── commands/               # Commander.js subcommands
│   │   ├── tui/                    # Ink React components
│   │   └── output/                 # Formatted output (JSON, table, stream)
│   │
│   ├── 3. orchestrator/            # Bộ não điều phối
│   │   ├── state-machine/          # Session lifecycle (16 states)
│   │   ├── task-decomposer/        # Auto-decompose backlog → subtasks
│   │   ├── agent-router/           # Route tasks → specialized agents
│   │   └── ralph-loop/             # Fresh-context iteration engine
│   │
│   ├── 4. providers/               # CLI Provider adapters
│   │   ├── base-provider/          # Abstract Provider interface
│   │   ├── claude-provider/        # Claude CLI adapter
│   │   ├── opencode-provider/      # OpenCode CLI adapter
│   │   └── codex-provider/         # Codex CLI adapter
│   │
│   ├── 5. skills/                  # Knowledge system
│   │   ├── skill-loader/           # YAML frontmatter + MD parser
│   │   ├── skill-registry/         # Trigger-based auto-loading
│   │   └── hooks/                  # PreToolUse / PostToolUse events
│   │
│   ├── 6. workspace/               # Môi trường làm việc
│   │   ├── git-worktree/           # Isolated git worktrees
│   │   ├── task-tracker/           # Dependency-aware task chains
│   │   ├── file-manager/           # Read/write/search operations
│   │   └── inbox/                  # Inter-agent messaging
│   │
│   ├── 7. verification/            # Đảm bảo chất lượng
│   │   ├── quality-gates/          # Typecheck, lint, test, build
│   │   ├── llm-judge/              # Non-deterministic backpressure
│   │   ├── cost-tracker/           # Token budgets, spend limits
│   │   └── attribution/            # AI-written code tracking
│   │
│   └── 8. dashboard/               # Web UI
│       ├── api/                    # REST + WebSocket API
│       ├── components/             # React components (shadcn)
│       ├── editor/                 # Monaco Editor integration
│       └── monitoring/             # Real-time agent status
│
├── plugins/                        # External plugins
├── skills/                         # Default skill definitions
├── agents/                         # Agent configs (YAML/TS)
├── config/                         # System config templates
└── docs/                           # Documentation
```

---

## 🔄 Data Flow Mindmap

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  HUMAN  │────▶│  CLI Layer  │────▶│ Orchestrator │────▶│   Agent     │
│ (User)  │     │ (Ink/Cmd)   │     │ (State Mach) │     │ (Specialist)│
└─────────┘     └─────────────┘     └──────┬───────┘     └──────┬──────┘
     ▲                                      │                    │
     │                                      ▼                    ▼
     │                             ┌──────────────┐     ┌─────────────┐
     │                             │   Router     │     │  Provider   │
     │                             │ (Intent Gate)│     │ (Claude/OC/ │
     │                             └──────┬───────┘     │  Codex CLI) │
     │                                    │             └──────┬──────┘
     │                                    ▼                    │
     │                             ┌──────────────┐           │
     │                             │   Skills +   │◀──────────┘
     │                             │   Hooks      │
     │                             └──────┬───────┘
     │                                    │
     │                                    ▼
     │                             ┌──────────────┐
     │                             │  Workspace   │
     │                             │ (Worktree +  │
     └─────────────────────────────│  Tracker)    │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Verification │
                                   │ (Gates +     │
                                   │  LLM Judge)  │
                                   └──────────────┘
```

---

## 🧠 Agent Specialization Mindmap

```
                        ┌──────────────────┐
                        │   ORCHESTRATOR   │
                        │ (Sisyphus-like)  │
                        └────────┬─────────┘
                                 │
         ┌───────────┬───────────┼───────────┬───────────┐
         │           │           │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌───┴────┐ ┌───┴────┐ ┌────┴────┐
    │ PLANNER │ │ BUILDER │ │REVIEWER│ │ RESEARCH│ │OPS/DEVOP│
    │(Prometh)│ │(Hephaes)│ │(Momus) │ │(Librar)│ │(Deploy) │
    └────┬────┘ └────┬────┘ └───┬────┘ └───┬────┘ └────┬────┘
         │           │          │           │           │
    ┌────┴────┐ ┌────┴────┐    │      ┌────┴────┐     │
    │Plan     │ │Impl     │    │      │Code     │     │
    │Decomp   │ │Exec     │    │      │Search   │     │
    │Task     │ │Debug    │    │      │Doc      │     │
    │Priority │ │Refactor │    │      │Web      │     │
    └─────────┘ └─────────┘    │      └─────────┘     │
                          ┌────┴────┐            ┌────┴────┐
                          │Spec    │            │CI/CD   │
                          │Review  │            │Deploy  │
                          │Quality │            │Monitor │
                          └─────────┘            └─────────┘
```

---

## 🔌 Plugin System (8 Slots)

```
┌───────────────────────────────────────────────────────┐
│                    PLUGIN REGISTRY                      │
├───────────┬───────────┬───────────┬───────────────────┤
│  runtime  │   agent   │ workspace │      tracker      │
│ (tmux/    │ (claude/  │ (worktree/│ (github/linear/   │
│  docker/  │  opencode/│  clone)   │  jira)            │
│  process) │  codex)   │           │                   │
├───────────┼───────────┼───────────┼───────────────────┤
│    scm    │ notifier  │ terminal  │      tool         │
│ (github/  │ (slack/   │ (iterm2/  │ (filesystem/web/  │
│  gitlab)  │  webhook) │  web/ink) │  mcp connectors)  │
└───────────┴───────────┴───────────┴───────────────────┘

Mỗi slot:
  - Interface TypeScript chặt chẽ
  - Lifecycle: register → configure → activate → deactivate
  - Event hooks nằm ở skill/hook layer (không phải plugin slot riêng)

Autonomy mode by phase:
  - Phase 1: Assisted (human-triggered commands)
  - Phase 2: Semi-autonomous (single-agent with deterministic gates)
  - Phase 3: Guardrailed multi-agent (worktree isolation + escalation)
  - Phase 4: Monitoring/UI expansion (không tăng autonomy mặc định)
```

---

## 📊 Session State Machine

```
  ┌──────────┐    spawn    ┌──────────┐    detect    ┌──────────┐
  │  IDLE    │────────────▶│ SPAWNING │────────────▶│ WORKING  │
  └──────────┘             └──────────┘             └────┬─────┘
       ▲                       │                       │  │
       │                       │ error                 │  │
       │                       ▼                       │  ▼
       │                  ┌──────────┐                 │ ┌──────────┐
       │                  │ ERRORED  │◀────────────────┘ │PR_OPEN   │
       │                  └──────────┘                   └────┬─────┘
       │                       │                             │
       │                       │ retry                       ▼
       │                       │                        ┌──────────┐
       │                       │                        │CI_FAILED │───┐
       │                       │                        └──────────┘   │
       │                       │                             │         │
       │                       │                             ▼         │
       │                       │                        ┌──────────┐   │
       │                       │                        │REVIEW_   │   │
       │                       │                        │PENDING   │   │
       │                       │                        └────┬─────┘   │
       │                       │                             │         │
       │                       │                             ▼         │
       │                       │                        ┌──────────┐   │
       │                       │                        │CHANGES_  │◀──┘
       │                       │                        │REQUESTED │
       │                       │                        └────┬─────┘
       │                       │                             │
       │                       │                             ▼
       │                       │                        ┌──────────┐
       │                       │                        │ APPROVED │
       │                       │                        └────┬─────┘
       │                       │                             │
       │                       │                             ▼
       │                       │                        ┌──────────┐
       │                       │                        │MERGEABLE │
       │                       │                        └────┬─────┘
       │                       │                             │
       │                       │                             ▼
       │                       │                        ┌──────────┐
       │                       │                        │ MERGED   │
       │                       │                        └────┬─────┘
       │                       │                             │
       │                       │                             ▼
       │                       │                        ┌──────────┐
       │                       │                        │ CLEANUP  │
       │                       │                        └────┬─────┘
       │                       │                             │
       │                       │                             ▼
       │                       │                        ┌──────────┐
       └───────────────────────────────────────────────│  DONE    │
                                                        └──────────┘
```

---

## 🏗️ Build Priority (MVP → Full)

```
Phase 1 (MVP - 4 weeks):
  ┌─────────────────────────────────┐
  │ core → providers → orchestrator │
  │ → cli (basic)                   │
  │ = Có thể chạy 1 agent qua CLI   │
  └─────────────────────────────────┘

Phase 2 (Skills + Quality - 3 weeks):
  ┌─────────────────────────────────┐
  │ skills → hooks → verification   │
  │ = Có thể review + quality gate  │
  └─────────────────────────────────┘

Phase 3 (Team - 3 weeks):
  ┌─────────────────────────────────┐
  │ workspace → inbox → tracker     │
  │ = Multi-agent coordination      │
  └─────────────────────────────────┘

Phase 4 (Dashboard - 2 weeks):
  ┌─────────────────────────────────┐
  │ dashboard (Next.js + Monaco)    │
  │ = Web UI monitoring + editing   │
  └─────────────────────────────────┘
```

---

## 📐 Design Principles

1. **Fresh Context per Iteration** (Ralph pattern) — tránh context pollution
2. **Intent Gate Before Action** (oh-my-openagent) — classify → route → execute
3. **Two-Stage Review** (Superpowers) — spec compliance + code quality
4. **Event-Driven Everything** (Agent-Orchestrator) — loose coupling via event bus
5. **Plugin-First** (8-slot system) — mọi thứ thay thế được qua plugins
6. **Backpressure as Feature** (Ralph Playbook) — quality gates không optional
7. **Worktree Isolation** (Superset/ClawTeam) — mỗi agent 1 git worktree riêng
8. **Markdown Skills** (ECC) — YAML frontmatter + MD body, dễ mở rộng
