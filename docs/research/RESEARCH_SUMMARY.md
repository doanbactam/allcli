# AllCLI — Nghiên Cứu 21+ Dự Án Nguồn

> **Ngày nghiên cứu**: 2026-04-03  
> **Mục đích**: Tổng hợp patterns, kiến trúc, và lessons learned từ 21+ dự án open-source và commercial  

---

## Tổng Quan Phân Loại Dự Án

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHÂN LOẠI DỰ ÁN NGHIÊN CỨU                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Agent Framework │ CLI/Editor      │ Dev Automation Platform     │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Superpowers     │ Monaco Editor   │ Devin AI                    │
│ Hermes-Agent    │ Ink             │ Factory AI                  │
│ Autoresearch    │ NanoCoder       │ OpenClaude                  │
│ Agent-Browser   │ Paperclip       │ CodePilot                   │
│ Agent-Orchestr. │                 │ Superset                    │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Team/Academic   │ Harness/Ctrl    │ Tracking                    │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ ClawTeam        │ awesome-harness │ Git AI                      │
│ OpenHarness     │ everything-cc   │                             │
│ oh-my-openagent │ Ralph Loop      │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 1. Harness Engineering & Control Layer

### 1.1. awesome-harness-engineering (walkinglabs)

**Loại**: Awesome list / Resource collection  
**Giá trị**: Framework tư duy về 5-layer architecture

| Layer | Trách nhiệm | Ví dụ |
|-------|------------|-------|
| Orchestration | Agent execution flow | Ralph Loop, state machines |
| Context Management | Token budgeting, history | AGENTS.md, progress.txt |
| Tool Integration | External system access | CLI adapters, file ops |
| Verification | Output validation | Typecheck, test, LLM judge |
| Operations | Cost control, monitoring | Budget tracking, health checks |

**Lesson**: Tách biệt rõ 5 concerns này giúp hệ thống modular và testable.

### 1.2. everything-claude-code (affaan-m)

**Loại**: Production-ready plugin ecosystem  
**Scale**: 38 agents, 156 skills, 72 commands, 8 hook types  
**Key patterns**:

```yaml
# Skill frontmatter format
---
name: nestjs-patterns
description: NestJS architecture patterns
origin: ECC
---
# Instructions body in Markdown
```

```json
// Hook configuration
{
  "FileSave": ["lint", "typecheck"],
  "PreCommit": ["run-tests", "quality-check"],
  "SessionStart": ["start-observer"],
  "SessionEnd": ["stop-observer"]
}
```

**Lesson**: YAML frontmatter + Markdown body format scale được đến 156+ skills. Trigger-based auto-loading hiệu quả.

### 1.3. Ralph Loop (snarktank/ralph + ghuntley/how-to-ralph-wiggum)

**Loại**: Autonomous agent loop  
**Core pattern**: Fresh context per iteration, state persistence via git + JSON

```bash
# Outer loop
for i in $(seq 1 $MAX_ITERATIONS); do
  # 1. Spawn fresh AI instance (no memory)
  claude --dangerously-skip-permissions < CLAUDE.md
  
  # 2. Check completion signal
  if grep -q "<promise>COMPLETE</promise>" output; then
    break
  fi
done
```

**Key abstractions**:
- `prd.json` — Task state (user stories with passes/fails)
- `progress.txt` — Append-only learnings log
- Git commits — History between iterations

**Ralph Playbook additions**:
- Dual-prompt system: `PROMPT_plan.md` vs `PROMPT_build.md`
- LLM-as-Judge for non-deterministic quality
- `fast` (Gemini Flash) vs `smart` (GPT-4.1) intelligence levels
- Backpressure as first-class abstraction

**Lesson**: Fresh context + deterministic state = reliable autonomous execution. PRD-driven approach scales.

---

## 2. Agent Frameworks

### 2.1. Superpowers (obra/superpowers)

**Loại**: Skill-based plugin system với subagent orchestration  
**Key innovation**: Mandatory workflows, not suggestions

**Workflow stages**:
1. Brainstorming → Design refinement
2. Git Worktrees → Isolated workspace
3. Writing Plans → Break into 2-5 min tasks
4. Subagent-Driven Development → Two-stage review
5. TDD → RED-GREEN-REFACTOR
6. Code Review → Pre-review checklist
7. Finishing Branch → Merge/PR/cleanup

**Model selection by complexity**:
| Task complexity | Model | Cost |
|----------------|-------|------|
| Mechanical (1-2 files) | Fast/cheap | Low |
| Integration (multi-file) | Standard | Medium |
| Architecture/design/review | Most capable | High |

**Agent status handling**:
- DONE → Spec compliance review
- DONE_WITH_CONCERNS → Read concerns first
- NEEDS_CONTEXT → Provide and re-dispatch
- BLOCKED → Escalate

**Lesson**: Two-stage review (spec + quality) prevents drift. Model selection by complexity optimizes cost.

### 2.2. Hermes-Agent (NousResearch)

**Loại**: Python agent với security-first approval system  
**Key innovation**: 70+ dangerous command patterns + smart LLM approval

```python
DANGEROUS_PATTERNS = [
    (r'\brm\s+(-[^\s]*\s+)*/', "delete in root path"),
    (r'\brm\s+-[^\s]*r', "recursive delete"),
    (r'\bchmod\s+777\b', "world-writable permissions"),
    # ... 70+ patterns
]
```

**Approval modes**: `manual` | `smart` (LLM risk assessment) | `off`

**Lesson**: Pattern-based security + LLM-as-safety-judge = practical autonomous security.

### 2.3. Autoresearch (karpathy)

**Loại**: Minimal autonomous research loop (Python)  
**Key innovation**: Extreme simplicity

```
LOOP FOREVER:
1. Look at git state
2. Tune train.py with experimental idea
3. git commit
4. Run experiment (5 min timeout)
5. Read results
6. If improved → keep, else → git reset
```

**Lesson**: Giản lược = reliable. Fixed time budget = comparable experiments. Simple keep/reset = clear decisions.

### 2.4. Agent-Browser (vercel-labs)

**Loại**: Rust CLI + WebSocket daemon cho browser automation  
**Key innovation**: Thin CLI + heavy daemon via Unix sockets

```
CLI (thin) → Unix Socket → Daemon (Rust) → Browser (CDP)
```

**Lesson**: Tách CLI thin + daemon heavy = efficient IPC, type-safe JSON, persistent state.

### 2.5. Agent-Orchestrator (ComposioHQ) ⭐ MOST RELEVANT

**Loại**: Comprehensive monorepo với plugin architecture  
**Key innovation**: 8-slot plugin system + event-driven state machine

**8 Plugin Slots**:
| Slot | Mục đích | Ví dụ |
|------|---------|-------|
| runtime | Where agents execute | tmux, docker, k8s |
| agent | AI coding tool | claude-code, codex, aider |
| workspace | Code isolation | worktree, clone |
| tool | Tool connectors | filesystem, web, mcp connectors |
| tracker | Issue tracking | github, linear, jira |
| scm | Source + PR/CI | github, gitlab |
| notifier | Notifications | slack, webhook, desktop |
| terminal | Human UI | iterm2, web, ink |

**16 Session States (AllCLI profile)**: `idle → spawning → working → pr_open → ci_failed → review_pending → changes_requested → approved → mergeable → merged → cleanup → needs_input → stuck → errored → killed → done`

**Lifecycle Manager**: Polling-based (30s) + reaction engine for auto-actions

**Lesson**: Plugin-first + event-driven = maximum extensibility. State machine = predictable lifecycle.

---

## 3. CLI & Editor Frameworks

### 3.1. Monaco Editor (microsoft)

**Loại**: VS Code editor core  
**Architecture**: Model-Editor-Provider pattern

```typescript
// Model = content + language + URI
const model = monaco.editor.createModel(code, 'typescript', uri);

// Editor = view of model
const editor = monaco.editor.create(container, { model });

// Provider = smart features (completion, hover, etc.)
monaco.languages.registerCompletionItemProvider('typescript', { ... });
```

**Lesson**: Model-Editor-Provider separation allows multiple views of same content. Ideal for diff viewing in dashboard.

### 3.2. Ink (vadimdemedes)

**Loại**: React renderer cho terminal  
**Architecture**: Custom React reconciler + Yoga Flexbox

```typescript
import { render, Box, Text, useInput } from 'ink';

const App = () => {
  useInput((input, key) => {
    if (key.leftArrow) handleNavigate();
  });
  return (
    <Box flexDirection="column">
      <Text color="green">Status OK</Text>
    </Box>
  );
};
render(<App />);
```

**Lesson**: React model trong terminal = familiar, composable. Full TypeScript types. Rich component ecosystem.

### 3.3. NanoCoder (Nano-Collective)

**Loại**: Local-first CLI AI agent (Ink-based)  
**Architecture**: Ink + React hooks + VS Code bridge

**Key pattern**: Custom hooks cho AI integration
```typescript
useChatHandler()      // AI conversation management
useAppState()         // Global state
useAppHandlers()      // Business logic
useToolHandler()      // Tool execution
useContextPercentage() // Token budget monitoring
```

**VS Code integration**: Extension bridge với file context + selection

**Lesson**: Ink + React hooks pattern proven for AI CLI tools. VS Code bridge extends reach.

### 3.4. Paperclip (paperclipai)

**Loại**: Agent orchestration platform (Node + React)  
**Architecture**: CLI + Server + Dashboard + Heartbeat system

**Key abstractions**:
- Org charts for agent hierarchy
- Ticket-based task management
- Cost tracking with token budgets
- Heartbeat monitoring (agents wake on schedule)

**Lesson**: Org-chart metaphor = intuitive team management. Heartbeat = reliable agent lifecycle.

---

## 4. Dev Automation Platforms

### 4.1. Devin AI

**Loại**: Fully autonomous AI software engineer ($500/month)  
**Success rates (real-world)**:
| Task Type | Success Rate |
|-----------|-------------|
| Well-defined bug fixes | 78% |
| Test writing | 82% |
| Small features | 65% |
| Refactoring | 45% |
| Ambiguous requirements | 35% |
| New architecture | 15% |

**Lesson**: "Last 30% problem" — delivers core but misses edge cases. Human review vẫn critical.

### 4.2. Factory AI Missions

**Loại**: Multi-day autonomous missions  
**Architecture**: Orchestrator + Workers + Validators

**Real data**:
- Median duration: 2 hours
- 65% run > 1 hour, 37% run > 4 hours
- 14% run > 24 hours, longest: 16 days
- Token usage: 12x median vs normal sessions

**Lesson**: Multi-day autonomous work IS viable. Needs: milestone tracking, validation gates, auto-recovery.

### 4.3. OpenClaude (Gitlawb)

**Loại**: Multi-provider CLI (99.9% TypeScript)  
**Support**: 200+ models via OpenAI-compatible APIs  
**Features**: Streaming, tool calling, multi-step loops

**Lesson**: Multi-provider abstraction viable. Strong TypeScript support.

### 4.4. Superset (superset-sh)

**Loại**: IDE for orchestrating 10+ parallel AI agents  
**Architecture**: Electron + parallel worktrees  
**Features**: Terminal multiplexer, diff viewer, workspace management

**Lesson**: Parallel agents + isolated worktrees = efficient multi-task execution.

---

## 5. Team / Academic Projects

### 5.1. ClawTeam (HKUDS) ⭐

**Loại**: Agent Swarm Intelligence framework (Python)  
**Key innovations**:

**Inbox-based messaging**:
```python
oh inbox send <team> <agent> "status update"
oh inbox receive <team>          # Check inbox
oh inbox broadcast <team> "msg"  # All agents
```

**Dependency chains**:
```python
oh task create <team> "T2" --blocked-by T1,T3
# Auto-unblock when T1 and T3 complete
```

**Demonstrated**: 8 agents × 8 H100 GPUs, 2000+ autonomous experiments

**Lesson**: Inbox messaging + dependency chains = reliable multi-agent coordination. Swarm scale đã được prove.

### 5.2. OpenHarness (HKUDS)

**Loại**: Lightweight agent harness (Python)  
**Key pattern**: Agent loop with tool orchestration

```python
while True:
    response = await api.stream(messages, tools)
    if response.stop_reason != "tool_use": break
    for tool_call in response.tool_uses:
        result = await harness.execute_tool(tool_call)
    messages.append(tool_results)
```

**Features**: 43 tools, 16 commands, permission system, React TUI

**Lesson**: Simple agent loop + tool registry = sufficient for most tasks. Don't over-engineer.

### 5.3. oh-my-openagent (code-yeongyu) ⭐ MOST RELEVANT TypeScript

**Loại**: Full TypeScript agent harness (47.5k stars)  
**Key innovations**:

**Intent-Gated Orchestration**:
```
User Request → Intent Gate → Classify → Route → Execute → Verify
```

**Specialized agents**:
| Agent | Role | Cost |
|-------|------|------|
| Sisyphus | Main orchestrator | EXPENSIVE |
| Prometheus | Strategic planner | EXPENSIVE |
| Hephaestus | Architecture debugger | EXPENSIVE |
| Librarian | Code search + docs | CHEAP |
| Explore | Contextual grep | FREE |

**Category-based delegation**:
| Category | Purpose |
|----------|---------|
| visual-engineering | Frontend, UI/UX |
| ultrabrain | Hard logic |
| deep | Autonomous research |
| quick | Single-file changes |
| writing | Documentation |

**Lesson**: Intent gate prevents misrouting. Category-based delegation = right agent for right task. Full TypeScript proven at scale.

---

## 6. Cross-Cutting Patterns Summary

### 6.1. Patterns proved effective

| Pattern | Proved by | Áp dụng vào AllCLI |
|---------|-----------|-------------------|
| Fresh context per iteration | Ralph, Autoresearch | Ralph Loop engine |
| Event-driven state machine | Agent-Orchestrator | Session lifecycle |
| 8-slot plugin system | Agent-Orchestrator | Plugin architecture |
| YAML+MD skills | ECC (156 skills) | Skill format |
| Inbox messaging | ClawTeam | Inter-agent comms |
| Intent gate routing | oh-my-openagent | Request classification |
| Worktree isolation | Superset, ClawTeam | Workspace management |
| Two-stage review | Superpowers | Quality process |
| LLM-as-Judge | Ralph Playbook | Non-deterministic QA |
| Model selection by complexity | Superpowers | Cost optimization |

### 6.2. Anti-patterns identified

| Anti-pattern | Nguồn | Lesson |
|-------------|-------|--------|
| Single monolithic agent | Multiple | Specialized agents > generalist |
| State in memory only | Multiple | Persist state (git+JSON+files) |
| No quality gates | Multiple | Backpressure = feature |
| Full autonomy without escalation | Devin | Human escalation critical |
| Fixed model for all tasks | Multiple | Match model to complexity |
| In-memory context only | Multiple | AGENTS.md + progress.txt |

### 6.3. Realistic capabilities (April 2026)

```
Tier 1 - Reliable (70-85%):
  ✅ Bug fixes (well-defined)
  ✅ Test writing
  ✅ Boilerplate generation
  ✅ Documentation
  ✅ Simple migrations

Tier 2 - Moderate (40-65%):
  ⚠️ Small features
  ⚠️ Refactoring
  ⚠️ Multi-file changes
  ⚠️ Performance optimization

Tier 3 - Challenging (15-35%):
  ❌ Architecture decisions
  ❌ Ambiguous requirements
  ❌ Novel problem-solving
  ❌ Security-critical code
  ❌ "Last 30%" completion
```
