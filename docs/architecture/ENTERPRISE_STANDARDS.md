# Enterprise Engineering Standards

This document defines engineering standards for AllCLI as a 100% TypeScript monorepo, including governance, architecture discipline, CI quality gates, and the three CLI layers (Claude CLI, OpenCode CLI, Codex CLI).

## 1) Language and Repository Baseline

- All source, tests, scripts, and tooling must be TypeScript.
- TypeScript strict mode is mandatory (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
- Monorepo uses `pnpm` workspaces with locked dependencies.
- Shared `tsconfig` baseline at repository root; package-level overrides must be minimal and documented.

## 2) Layering and Boundaries

AllCLI uses explicit separation of concerns:

- **Claude CLI layer**: orchestration and lifecycle control.
- **OpenCode CLI layer**: generation and developer workflow execution.
- **Codex CLI layer**: code analysis/review assistance and knowledge workflows.

Rules:

- Cross-layer contracts must be typed and versioned.
- No direct hidden coupling between layers (only through typed interfaces/events).
- Provider-specific behavior must stay inside provider adapters.

## 3) Plugin and Interface Governance

- Plugin slots follow typed contracts (runtime, agent, tool, workspace, tracker, scm, notifier, terminal).
- Any new plugin slot requires an ADR.
- Each plugin must define lifecycle hooks: register, configure, activate, deactivate.
- Plugin failures must degrade gracefully without corrupting session state.

## 4) Architecture Decision Discipline (ADR)

Use ADR for all non-trivial changes:

- New package introduction or merge/split of packages
- State machine changes
- Provider interface changes
- New quality gate types
- Security-sensitive tool execution policy changes

Each ADR must include:

1. Problem statement
2. Constraints
3. Considered options
4. Chosen option and rationale
5. Consequences and rollback strategy

## 5) Code Quality and Testing Standards

- Public APIs require unit tests.
- Cross-package workflows require integration tests.
- No `any`, `@ts-ignore`, or `@ts-expect-error` as shortcuts.
- Error handling must be explicit and actionable.
- Keep interfaces small and intention-revealing.

Minimum quality gates:

1. Typecheck
2. Lint
3. Tests
4. Build

## 6) CI/CD and Reproducibility

- CI must block merge on failed quality gates.
- Install/build/test must be reproducible using lockfile.
- Release notes must explain **why** changes were made, not only what changed.
- Versioning follows semver for externally consumed packages.

## 7) Security and Operational Safety

- No credentials or secrets committed.
- Command execution safety policy must include deny/guard patterns for destructive operations.
- Tool execution events must be auditable.
- Cost tracking and budget limits are mandatory for autonomous runs.

## 8) Documentation as a First-Class Deliverable

- Every architectural change updates architecture docs.
- MVP scope changes must update `MVP_SCOPE.md`.
- Roadmap changes must update `ROADMAP.md`.

## 9) Pull Request Hygiene

Each PR should include:

- Problem and scope
- Architectural impact
- Verification evidence (typecheck/lint/test/build)
- Documentation updates (if needed)

## 10) Enforcement Checklist

- [ ] 100% TypeScript preserved
- [ ] Layer boundaries respected
- [ ] ADR added for non-trivial architecture changes
- [ ] CI quality gates all green
- [ ] Security/cost safeguards in place
- [ ] Docs updated consistently
