# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

AllCLI — Nền tảng orchestration AI agent, điều phối nhiều CLI AI providers (Claude CLI, OpenCode CLI, Codex CLI) qua kiến trúc plugin mở rộng. 100% TypeScript, pnpm monorepo, strict mode.

## Lệnh phát triển

```bash
pnpm install              # Cài dependencies
pnpm build                # Build tất cả packages (tsc -b, project references)
pnpm typecheck            # Kiểm tra type errors
pnpm lint                 # ESLint
pnpm test                 # Vitest — chạy tất cả tests
pnpm verify               # typecheck + lint + test + build (chạy trước khi commit)

# Chạy test một file cụ thể
pnpm vitest run packages/core/tests/config-loader.test.ts

# Chạy test theo pattern
pnpm vitest run packages/orchestrator/tests/

# Dashboard (riêng — Vite, không dùng tsc -b)
cd packages/dashboard && pnpm dev        # Dev server
cd packages/dashboard && pnpm build      # Build Vite
```

## Kiến trúc

### 5 Layer

```
CLI (Ink + Commander) → Orchestrator → Providers → Workspace → Verification
```

### 8 Packages & Dependency graph

```
core (zero deps) ← foundation types, event bus, plugin registry, config loader
├── providers    ← core              | Adapter pattern cho Claude/OpenCode/Codex CLI
├── skills       ← core              | YAML+MD skill loader, trigger registry, hook engine
├── workspace    ← core              | Git worktree, task tracker, inbox messaging, file ops
├── verification ← core              | Quality gates (typecheck/lint/test/build), cost tracker
├── orchestrator ← core, providers, workspace | State machine, session manager, ralph loop, agent router
├── cli          ← all packages      | Commander commands + Ink TUI, API server
└── dashboard    ← standalone (Vite)  | React + Tailwind + Radix UI, không dùng tsc -b
```

### TypeScript Project References

Root `tsconfig.json` dùng `references` đến 7 packages (trừ dashboard — dùng Vite riêng). Mỗi package extend `tsconfig.base.json` với `composite: true`. Dashboard có tsconfig riêng với `moduleResolution: "bundler"`.

### Path aliases

```
@allcli/core        → packages/core/src/index.ts
@allcli/providers   → packages/providers/src/index.ts
@allcli/orchestrator → packages/orchestrator/src/index.ts
@allcli/cli         → packages/cli/src/index.tsx
```

Vitest aliases phải khớp với `tsconfig.base.json` paths — đã cấu hình trong `vitest.config.ts`.

### Config format

`allcli.yaml` ở root project — định nghĩa providers, orchestrator settings, workspace isolation, verification gates. Parsed bằng thư viện `yaml` + validated bằng Zod (`@allcli/core`).

### Skill system

Skills là thư mục chứa `SKILL.md` với YAML frontmatter (name, triggers, category, cost, scope) + body markdown. Built-in skills ở `packages/skills/src/builtin/`. Trigger-based auto-loading — keywords trong task description trigger load skill tương ứng.

### Provider pattern

`BaseProvider` abstract class → `ClaudeProvider`, `OpenCodeProvider`, `CodexProvider`. Giao diện thống nhất: `spawn`, `sendMessage`, `getOutput`, `isAlive`, `getActivityState`, `destroy`. Mỗi provider spawn CLI process con qua `process-manager`.

### Session state machine

16 trạng thái (`idle` → `spawning` → `working` → `done/errored/stuck/...`), chuyển đổi chỉ theo map hợp lệ đã định nghĩa trong `SessionStateMachine`.

### Ralph Loop

Autonomous iteration engine: chạy lại context mới mỗi iteration, state persist qua git + JSON, max 50 iterations, timeout 10 phút/iteration.

## Convention quan trọng

- **ESM only**: `"type": "module"`, imports phải có `.js` extension trong TypeScript imports
- **Strict mode**: `strict`, `noImplicitOverride`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **ESLint**: `@typescript-eslint/no-explicit-any: "error"` — không dùng `any`
- **Test location**: `packages/<name>/tests/*.test.ts` — không nằm trong `src/`
- **Vitest environment**: `"node"` cho tất cả tests
- **Dashboard**: React 19 + Tailwind 4 + Vite, dùng `@/` path alias cho `src/`, Radix UI primitives + `clsx`/`tailwind-merge` cho styling

## Giai đoạn dự án

Dự án theo 4 phase (xem `docs/ROADMAP.md`):
1. **MVP** (hiện tại): 1 agent, 1 task, Claude provider
2. Skills & Quality gates + multi-provider
3. Multi-agent worktree isolation + Ralph Loop
4. Dashboard web UI

Phase gates không được skip — phải pass tất cả criteria trước khi chuyển phase.
