import type { SessionStatus } from "@allcli/core";

const transitions: Record<SessionStatus, ReadonlySet<SessionStatus>> = {
  idle: new Set<SessionStatus>(["spawning"]),
  spawning: new Set<SessionStatus>(["working", "errored", "killed"]),
  working: new Set<SessionStatus>([
    "pr_open",
    "needs_input",
    "stuck",
    "errored",
    "idle",
    "killed",
    "done"
  ]),
  pr_open: new Set<SessionStatus>(["ci_failed", "review_pending", "merged", "errored"]),
  ci_failed: new Set<SessionStatus>(["working", "changes_requested"]),
  review_pending: new Set<SessionStatus>(["approved", "changes_requested"]),
  changes_requested: new Set<SessionStatus>(["working"]),
  approved: new Set<SessionStatus>(["mergeable"]),
  mergeable: new Set<SessionStatus>(["merged", "cleanup"]),
  merged: new Set<SessionStatus>(["cleanup", "done"]),
  cleanup: new Set<SessionStatus>(["done"]),
  needs_input: new Set<SessionStatus>(["working", "killed"]),
  stuck: new Set<SessionStatus>(["working", "killed"]),
  errored: new Set<SessionStatus>(["spawning", "killed"]),
  killed: new Set<SessionStatus>(["idle"]),
  done: new Set<SessionStatus>([])
};

export class SessionStateMachine {
  canTransition(from: SessionStatus, to: SessionStatus): boolean {
    const allowed = transitions[from];
    return allowed ? allowed.has(to) : false;
  }

  assertTransition(from: SessionStatus, to: SessionStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal session transition: ${from} -> ${to}`);
    }
  }
}
