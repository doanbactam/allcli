# AllCLI

>All 
AllCLI là một CLI orchestration và AI coding agents (Claude CLI, OpenCode CLI, Codex CLI) across multiple isolated worktrees, theo kế dependency.

 and quality gates for projects.

 
AllCLI sử a pnpm workspace monorepo with 8 packages: `core`, `providers`, `cli`, `orchestrator`, `dashboard`, `workspace`, `skills`, `verification`.

 
## Quick Start
### Prerequisites
- Node.js >= 18 (LTS)
- pnpm >= 8
- Git >= 2.21
 
### Install dependencies
```bash
pnpm install
```
### Build
```bash
pnpm build
```
### Run tests
```bash
pnpm test
```
### Run full verification pipeline
```bash
pnpm verify
```
### Start CLI
```bash
pnpm allcli --help
```
 
## Architecture Overview

| Package | Description |
|---------|-------------|
| `core` | Type system, plugin registry, event bus, config loader |
| `providers` | Provider adapters (Claude, OpenCode, Codex CLI) |
| `cli` | CLI commands + Ink TUI + API server |
| `orchestrator` | Session lifecycle, state machine, agent routing, task decomposition, Ralph loop |
| `dashboard` | React web UI with real-time monitoring (Vite + React + WebSocket) |
| `workspace` | Git worktree management, task tracking, file operations, inbox messaging |
| `skills` | YAML+MD skill loading, trigger system, hook engine |
| `verification` | Quality gates (typecheck, lint, test, build) + cost tracking |
 
## CLI Usage
```bash
# Run a task
allcli run "fix the login bug in auth.ts"

allcli run "add user profile page" --provider opencode
# Agent management
allcli agent list
allcli agent kill <session-id>
# System status
allcli status
# Workspace management
allcli workspace create feature-auth
allcli workspace list
# Task management
allcli task create "Add login page" --priority 1
allcli task decompose <task-id>
# Ralph Loop
allcli loop --prd prd.json
# Skills
allcli skill list
# Quality verification
allcli verification check
# Dashboard
allcli dashboard
```
 
## Configuration
The project uses `allcli.yaml` in the root directory. See that file for detailed config options.
 
```yaml
version: "1"
project:
  name: allcli
providers:
  default: claude
  claude:
    command: claude
    model: sonnet
orchestrator:
  statePath: .allcli/sessions.json
  maxIterations: 50
workspace:
  baseBranch: main
  isolation: worktree
verification:
  gates: [typecheck, lint, test, build]
  costLimit:
    perSession: 10
    perProject: 100
```
 
## Development
### Scripts
| Script | Description |
|-------|-------------|
| `pnpm allcli` | Run CLI |
| `pnpm build` | TypeScript build |
| `pnpm typecheck` | Type checking |
| `pnpm lint` | ESLint |
| `pnpm test` | Run test suite |
| `pnpm verify` | Full pipeline (typecheck + lint + test + build) |

 
## Test Results
- 18 test files, 80 tests passing
- TypeScript strict mode: zero errors
- Build: clean exit
- Phase 1-4 complete (MVP done)
 
## Tech Stack
- TypeScript (strict mode)
- pnpm workspace monorepo
- Vitest test runner
- ESLint linting
- React 19 + React Router (dashboard)
- Vite (dashboard dev server)
- Ink (CLI terminal UI)
- YAML config format
