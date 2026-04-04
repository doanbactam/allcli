# External Benchmark Constraints (2026)

This note captures practical constraints from public references used to stress-test AllCLI feasibility.

## Benchmark Table (Concise)

| System | Architecture Pattern | Autonomy Limits | MVP Constraints for AllCLI |
|---|---|---|---|
| Agent-Orchestrator | Plugin slots + lifecycle manager + worktree isolation | Stuck/escalation thresholds required | Keep plugin boundaries typed; implement stuck/escalation early |
| Superset | Multi-agent orchestration in isolated worktrees | Parallelism introduces resource pressure | Introduce parallel mode only after single-agent stability |
| OpenClaude | Multi-provider CLI coding agent | Provider behavior variance | Strict adapter contracts + capability matrix |
| Devin (public integrations) | Session API + budgeted execution | Budget/session limits and uncertain tasks still hard | Build explicit budget guardrails and human escalation triggers |
| Factory missions (public claims) | Orchestrator + workers + validators | Long-run autonomy is viable but expensive/complex | Do not target multi-day autonomy in MVP |

## Practical Constraints Adopted

1. **No full autonomy in MVP** — assisted/semi-autonomous only.
2. **Deterministic guardrails first** — typecheck/lint/test/build before advanced LLM judging.
3. **Cost and stuck controls required** — budgets + iteration/retry limits.
4. **Provider abstraction must be contract-tested** — no provider-specific logic in core.
5. **Worktree isolation before swarm** — concurrency comes after stability.

## Decision Impact

- Confirms roadmap sequencing (single-agent foundation first).
- Confirms need for phase exit gates.
- Confirms need for adapter capability matrix and escalation policy.
