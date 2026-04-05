# AllCLI Internal Ship Readiness Design

**Goal**

Harden AllCLI from MVP status into an internal Windows-ready developer tool that the team can rely on for real work across CLI, local API, and TUI dashboard surfaces.

## Ship Contract

This ship targets internal use only.

- Distribution stays inside the repo.
- Windows is the only supported platform for this release.
- `claude` and `codex` CLIs are treated as required prerequisites.
- The local API binds to `localhost` only and does not add auth in v1.
- Every public command exposed by the CLI must either work end-to-end or fail with a clear corrective message.
- The required workflows are `run`, `agent`, `workspace`, `task`, `skill`, `loop`, `status`, `verify`, and `dashboard`.
- `pnpm verify` must pass on a clean checkout.

## Product Shape

AllCLI remains a monorepo with the current package boundaries. The release does not introduce a new platform architecture. Instead, it hardens the existing command, orchestration, provider, API, and TUI layers so they behave like a dependable internal tool instead of a demo-grade MVP.

The product ships as three connected surfaces backed by the same runtime state:

1. A CLI for task execution, workspace management, session control, verification, and operations.
2. A localhost API for automation and dashboard data access.
3. An Ink-based TUI dashboard for interactive monitoring and execution.

## Architecture Approach

The current `CliContext` pattern stays in place, but startup is split into two phases:

1. A readiness/bootstrap phase validates configuration, repository assumptions, and provider prerequisites.
2. A runtime context phase creates the provider, session manager, worktree manager, task tracker, and inbox only after readiness succeeds.

This keeps the existing architecture intact while removing repeated setup logic and inconsistent failures across commands.

## Readiness Layer

The new readiness layer is the main hardening addition for this ship.

It is responsible for:

- Validating that `allcli.yaml` exists and is readable.
- Ensuring the current directory is a usable project root for AllCLI operations.
- Checking that configured state paths can be created and written.
- Detecting whether required provider CLIs are installed and callable.
- Producing user-facing setup guidance when prerequisites are missing.
- Exposing a small shared contract that CLI commands, API startup, and the TUI can all use.

This layer should distinguish between setup problems and internal failures. Setup problems must not surface raw stack traces during normal command use.

## Shared App Metadata

Application metadata must come from a single source of truth.

Included values:

- Product name.
- Display version.
- Supported providers.
- User-facing labels used in the CLI and TUI.

This removes hardcoded version drift between command banners and the dashboard.

## Surface Contracts

### CLI Commands

All public commands keep their current names and general behavior. Hardening focuses on validation, consistent output, and stable exit semantics.

- `run` and `agent` must preflight provider availability before spawning processes.
- `status` must report real session state and use the shared version metadata.
- `workspace` commands must validate names and report git failures clearly on Windows.
- `task` commands must operate purely on real task tracker data.
- `skill` must list real skills without depending on undocumented state.
- `loop` must validate its inputs and fail clearly when prerequisites are missing.
- `verify` must reflect actual configured gates and set exit codes correctly.
- `dashboard` must refuse non-interactive terminals cleanly and run from live repo data in interactive terminals.

### Providers

The provider abstraction remains intact, but the release treats Claude and Codex as first-class supported providers.

- Missing executables must be detected before a task is launched.
- Spawn failures must be translated into guidance the user can act on.
- Runtime exit codes must continue to flow into session status transitions.
- Unsupported or misconfigured provider selections must fail early.

### API Server

The localhost API remains backed by `RepoHub` and `CliContext`.

- Routes must return structured JSON errors.
- Repo-scoped routes must preserve current default-repository safety rules.
- API startup must use the same readiness checks as the CLI.
- API responses must reflect live task, session, worktree, inbox, and verification data.

### TUI Dashboard

The Ink dashboard remains the primary interactive interface.

- The dashboard must load only from live runtime data.
- Navigation and tab switching must not crash when state is sparse or empty.
- Any command-like action triggered from the dashboard must reuse the same readiness and runtime contracts as the CLI.

## Error Handling Model

Errors fall into three groups.

1. Setup errors: missing config, missing provider executable, invalid repo assumptions, or unsupported terminal mode.
2. User/runtime errors: invalid task ID, invalid session ID, bad API payloads, or illegal state transitions initiated by the user.
3. Internal errors: unexpected exceptions or corrupted state.

The behavior for each group is:

- CLI surfaces concise human-readable errors and non-zero exit codes.
- API surfaces structured JSON error responses with appropriate status codes.
- Dashboard surfaces recoverable messages instead of crashing when possible.

## Testing Strategy

The release requires self-contained verification.

- All tests must run from the repo without depending on external fixture directories.
- The failing API E2E flow must be rewritten to set up its own config and workspace fixture inside the test boundary.
- Regression coverage should exist for config bootstrap failures, provider preflight behavior, version source-of-truth, and non-interactive command behavior.
- `pnpm verify` is the required gate for ship readiness.

## Docs And Operator Experience

Documentation for this release is operational rather than marketing-focused.

It must include:

- Windows prerequisites.
- Required installation of `claude` and `codex` CLIs.
- Minimal `allcli.yaml` setup guidance.
- A short quickstart for required workflows.
- Troubleshooting guidance for the most likely setup and runtime failures.
- Clear notes on where AllCLI stores session and workspace state.

## Definition Of Done

The release is ready to ship internally when all of the following are true.

- Every public CLI command behaves as a real product surface, not a demo placeholder.
- Shared version and app metadata are unified.
- Claude and Codex readiness checks are implemented and user-facing.
- API and dashboard both operate on live data and stable contracts.
- Tests are self-contained and `pnpm verify` passes.
- README and config guidance are sufficient for a Windows team member to clone the repo and start using AllCLI without tribal knowledge.

## Explicit Non-Goals

The release does not attempt to:

- Add public distribution through npm or GitHub Releases.
- Add authentication to the local API.
- Expand platform support beyond Windows.
- Replace the current package architecture with a deeper refactor.
- Introduce speculative new features unrelated to ship readiness.
