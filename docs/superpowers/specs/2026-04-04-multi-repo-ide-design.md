# Multi-Repo IDE Dashboard Design

**Goal**

Turn the existing monitoring dashboard into a real multi-repo IDE shell that works against live repository data and runtime actions instead of aspirational mock workflow screens.

## Product Shape

The app becomes a repo operations workspace with four core surfaces:

1. A repository rail for switching between multiple local repos.
2. A read-only explorer and file preview for the active repo.
3. A work surface for tasks and worktrees that map to existing backend primitives.
4. A control/runtime surface for prompt execution, agent spawning, verification, and live session logs.

## Backend Approach

The backend remains rooted in the existing per-repo `CliContext` model. Instead of replacing that architecture, a new multi-repo hub layers on top of it.

- `RepoRegistry` persists the set of connected repos.
- `RepoHub` lazily creates a `CliContext` per repo and reuses existing task, worktree, session, verification, and file primitives.
- `ApiServer` exposes new repo-scoped routes while keeping legacy single-repo routes working for existing tests and callers.
- WebSocket events now include `repoId` so the frontend can route runtime output to the correct workspace.

## Frontend Approach

The old routed dashboard pages are replaced by a single IDE workbench.

- Left rail: repository selection and repo add flow.
- Center-left: explorer.
- Center: file preview and work surface.
- Right: composer and runtime console.

The interface is intentionally grounded in what the backend can do today: inspect files, create tasks, create worktrees, run prompts, spawn agents, run verify, inspect session status, and stream live output.

## Scope

Included in this implementation:

- Multi-repo registry and repo switching.
- Repo summaries.
- Read-only file tree and file preview.
- Insert file preview into prompt composer.
- Task creation and listing.
- Worktree creation and listing.
- Prompt execution.
- Agent spawning.
- Verification runs.
- Session list, kill action, and live log display.

Explicitly excluded:

- In-app editing.
- PR/review workflow simulation.
- Cost analytics as a primary workflow.
- Fake agent role dashboards disconnected from live runtime.
