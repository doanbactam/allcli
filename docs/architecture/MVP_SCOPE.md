# MVP Scope (AllCLI)

This document defines exactly what the first shippable MVP includes and excludes.

## 1) MVP Objective

Deliver a practical, typed foundation that can:

1. Accept a task from CLI
2. Route to one provider adapter
3. Execute in the default project workspace (single working tree for MVP)
4. Track lifecycle state
5. Run mandatory quality checks
6. Report deterministic status/output

## 2) In-Scope (Must Have)

### MVP Packaging Policy (Realism)

- MVP should stay within **~6-7 effective build units (including docs/governance)** to reduce coordination overhead.
- End-state package boundaries can remain in architecture docs, but MVP delivery prioritizes minimal operational complexity.
- Plugin framework and advanced extension surfaces remain out-of-scope in MVP even if contracts are pre-defined.

### Core

- Typed core interfaces (session, provider, plugin, events)
- Minimal plugin registry
- Config loader

### Provider Layer

- Claude CLI adapter (required for full end-to-end proof)
- OpenCode CLI adapter (deferred to Phase 2 compatibility validation)
- Codex CLI adapter (deferred to Phase 2 compatibility validation)
- Unified provider interface for spawn/send/output/isAlive/destroy
- Delivery rule: prove end-to-end on one primary adapter first, then run compatibility checks on remaining adapters

### Orchestration

- Basic session state machine
- Session manager (spawn/list/kill/status)
- Simple task router (rule-based)

### Workspace (Post-MVP / Phase 3)

- Git worktree isolation for task sessions
- Basic file operation wrappers
- Not required for MVP acceptance criteria

### Verification

- Typecheck gate
- Test gate
- Lint gate
- Build gate
- Run summary with pass/fail

### CLI

- `allcli run <task>`
- `allcli agent list`
- `allcli agent kill <id>`
- `allcli status`

### Documentation

- Architecture doc
- Roadmap doc
- Research summary
- Mindmap
- Enterprise standards
- MVP scope

## 3) Out-of-Scope (Not in MVP)

- Full autonomous multi-day mission engine
- Advanced multi-agent swarm planning
- Rich dashboard with full observability stack
- Marketplace-scale plugin distribution
- Complex non-deterministic review pipelines

## 4) MVP Acceptance Criteria (Binary)

MVP is complete only if all conditions pass:

- [ ] All packages compile with zero TypeScript errors
- [ ] `allcli run <task>` can launch and complete through one primary provider path (Claude)
- [ ] Provider adapters for Claude/OpenCode/Codex are wired behind one unified interface
- [ ] Claude adapter is implemented behind the unified interface; OpenCode/Codex are specified for Phase 2 compatibility checks
- [ ] Session execution works in the default project workspace (worktree isolation deferred to Phase 3)
- [ ] Quality gates execute and return clear pass/fail
- [ ] Session state transitions are logged and inspectable
- [ ] Docs are present and internally consistent

### Post-MVP (Phase 2) Compatibility Criteria

- [ ] OpenCode/Codex compatibility is validated via adapter contract checks in Phase 2
- [ ] Capability matrix (required/optional/unsupported ops) is documented for all providers

## 5) Realism Constraints (2026)

- Autonomous coding is strongest on well-defined tasks, weaker on ambiguous ones.
- Human escalation must exist for stuck/uncertain states.
- Basic budget guardrails are required in MVP; detailed cost tracking is expanded in Phase 2.

## 6) MVP Risks and Mitigations

### Risk: Over-scoping early
- Mitigation: freeze MVP boundaries in this document.

### Risk: Provider divergence
- Mitigation: strict adapter boundary + contract tests.

### Risk: Hidden coupling between layers
- Mitigation: typed contracts + event-driven integration.

### Risk: Poor quality confidence
- Mitigation: mandatory deterministic quality gates.

### Risk: Too many active package boundaries in MVP
- Mitigation: freeze MVP to 6-7 effective build units and defer non-essential splits.

## 7) Done Definition

MVP is done when:

1. Required commands run successfully.
2. Required adapters work via unified interface.
3. Required quality gates pass and are visible in output.
4. Documentation reflects actual architecture and limitations.
