# Multi-Repo IDE Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old dashboard with a real multi-repo IDE shell backed by live repo data and executable actions.

**Architecture:** Add a repo registry and repo hub on the CLI backend, expose repo-scoped HTTP and WebSocket APIs, then replace the dashboard routes with a single workbench composed of repo rail, explorer, work surface, composer, and runtime console.

**Tech Stack:** TypeScript, Node HTTP server, ws, React, Vite, Tailwind CSS v4, Radix UI ScrollArea/Tabs.

---

### Task 1: Multi-Repo Backend Layer

**Files:**
- Create: `packages/workspace/src/repo-registry.ts`
- Modify: `packages/workspace/src/types.ts`
- Modify: `packages/workspace/src/file-manager.ts`
- Modify: `packages/workspace/src/index.ts`
- Create: `packages/cli/src/repo-hub.ts`
- Modify: `packages/cli/src/api-server.ts`

- [x] Add persistent repo registry primitives for connected repositories.
- [x] Extend file primitives to support directory snapshots and safe read-only previews.
- [x] Build a repo hub that reuses `CliContext` per repo and exposes repo-scoped operations.
- [x] Extend the API server with repo-scoped routes while preserving old single-repo routes.
- [x] Include `repoId` in live WebSocket events.

### Task 2: IDE Workbench Frontend

**Files:**
- Create: `packages/dashboard/src/hooks/use-live-data.ts`
- Create: `packages/dashboard/src/components/ide/panel-shell.tsx`
- Create: `packages/dashboard/src/components/ide/repo-rail.tsx`
- Create: `packages/dashboard/src/components/ide/explorer-panel.tsx`
- Create: `packages/dashboard/src/components/ide/file-viewer.tsx`
- Create: `packages/dashboard/src/components/ide/work-panel.tsx`
- Create: `packages/dashboard/src/components/ide/activity-panel.tsx`
- Create: `packages/dashboard/src/components/ide/control-panel.tsx`
- Create: `packages/dashboard/src/pages/ide-workbench.tsx`
- Modify: `packages/dashboard/src/lib/api-client.ts`
- Modify: `packages/dashboard/src/hooks/use-websocket.ts`
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/index.css`

- [x] Replace routed dashboard screens with a single IDE workbench.
- [x] Add repo rail and active repo header.
- [x] Add read-only file explorer and file preview.
- [x] Add file-to-composer insertion flow.
- [x] Add tasks and worktrees work surface.
- [x] Add composer actions for prompt, agent, and verify.
- [x] Add runtime session list, kill control, and live log pane.
- [x] Align visual language with an editor-like, production-facing shell.

### Task 3: Verification

**Files:**
- Verify only

- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test`.
- [x] Run `pnpm --filter @allcli/dashboard build`.
- [x] Run `pnpm verify`.
