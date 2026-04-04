import { randomUUID } from "node:crypto";
import type { EventMap, Provider, ProviderHandle, SessionRecord, SessionStatus, SpawnConfig } from "@allcli/core";
import { TypedEventBus } from "@allcli/core";
import { SessionStateMachine } from "./state-machine.js";
import { SessionStore } from "./session-store.js";

export interface RunTaskOptions {
  command?: string;
  model?: string;
  cwd: string;
  dangerous: boolean;
  outputFormat: "text" | "stream-json";
}

export class SessionManager {
  private readonly stateMachine = new SessionStateMachine();
  private readonly handles = new Map<string, ProviderHandle>();
  readonly events = new TypedEventBus<EventMap>();

  constructor(
    private readonly provider: Provider,
    private readonly store: SessionStore
  ) {}

  list(): SessionRecord[] {
    return this.reconcileSessions().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  status(): {
    total: number;
    spawning: number;
    working: number;
    pr_open: number;
    review_pending: number;
    done: number;
    errored: number;
    killed: number;
    stuck: number;
  } {
    const sessions = this.list();
    return {
      total: sessions.length,
      spawning: sessions.filter((s) => s.status === "spawning").length,
      working: sessions.filter((s) => s.status === "working").length,
      pr_open: sessions.filter((s) => s.status === "pr_open").length,
      review_pending: sessions.filter((s) => s.status === "review_pending").length,
      done: sessions.filter((s) => s.status === "done").length,
      errored: sessions.filter((s) => s.status === "errored").length,
      killed: sessions.filter((s) => s.status === "killed").length,
      stuck: sessions.filter((s) => s.status === "stuck").length
    };
  }

  async run(task: string, options: RunTaskOptions): Promise<SessionRecord> {
    const session = this.createSession(task, this.provider.name);
    const spawnConfig: SpawnConfig = {
      ...(options.command ? { command: options.command } : {}),
      prompt: task,
      cwd: options.cwd,
      dangerouslySkipPermissions: options.dangerous,
      outputFormat: options.outputFormat,
      ...(options.model ? { model: options.model } : {})
    };

    try {
      const handle = await this.provider.spawn(spawnConfig, {
        onStdout: (chunk) => {
          this.events.emit("session.output", { sessionId: session.id, chunk });
        },
        onStderr: (chunk) => {
          this.events.emit("session.output", { sessionId: session.id, chunk });
        },
        onError: (error) => {
          this.transition(session.id, "errored", error.message);
        },
        onExit: (code) => {
          if (this.getById(session.id)?.status === "killed") {
            return;
          }

          if (code === 0) {
            this.transition(session.id, "done");
            return;
          }

          this.transition(session.id, "errored", `Process exited with code ${code ?? "null"}`);
        }
      });

      this.handles.set(session.id, handle);
      this.patch(session.id, {
        pid: handle.pid
      });
      this.transition(session.id, "working");
      return this.getById(session.id) as SessionRecord;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown spawn error";
      this.transition(session.id, "errored", reason);
      return this.getById(session.id) as SessionRecord;
    }
  }

  async kill(sessionId: string): Promise<void> {
    const session = this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const killableStates: ReadonlySet<SessionStatus> = new Set([
      "spawning",
      "working",
      "needs_input",
      "stuck"
    ]);

    if (!killableStates.has(session.status)) {
      throw new Error(`Session in '${session.status}' state cannot be killed`);
    }

    const handle = this.handles.get(sessionId);
    if (handle) {
      await this.provider.destroy(handle);
    } else if (session.pid) {
      await killProcessWithEscalation(session.pid);
    }

    this.transition(sessionId, "killed");
  }

  /**
   * Remove all non-working sessions from the store.
   * Returns the number of sessions removed.
   */
  clean(): number {
    const sessions = this.reconcileSessions();
    const activeStates: ReadonlySet<SessionStatus> = new Set([
      "spawning",
      "working",
      "needs_input",
      "stuck",
      "pr_open",
      "ci_failed",
      "review_pending",
      "changes_requested",
      "approved",
      "mergeable"
    ]);
    const active = sessions.filter((s) => activeStates.has(s.status));
    const removed = sessions.length - active.length;
    if (removed > 0) {
      this.store.save(active);
    }
    return removed;
  }

  getById(sessionId: string): SessionRecord | undefined {
    return this.reconcileSessions().find((session) => session.id === sessionId);
  }

  private reconcileSessions(): SessionRecord[] {
    const sessions = this.store.load();
    let changed = false;

    const updated = sessions.map((session) => {
      const isActive = session.status === "working" || session.status === "spawning" || session.status === "needs_input";
      if (!isActive || !session.pid || this.handles.has(session.id)) {
        return session;
      }

      try {
        process.kill(session.pid, 0);
        return session;
      } catch {
        changed = true;
        return {
          ...session,
          status: "errored" as const,
          error: session.error ?? "Process is no longer running",
          updatedAt: new Date().toISOString()
        };
      }
    });

    if (changed) {
      this.store.save(updated);
    }

    return updated;
  }

  private createSession(task: string, provider: string): SessionRecord {
    const now = new Date().toISOString();
    const record: SessionRecord = {
      id: randomUUID(),
      task,
      provider,
      status: "spawning",
      createdAt: now,
      updatedAt: now
    };

    const sessions = this.store.load();
    sessions.push(record);
    this.store.save(sessions);
    return record;
  }

  private transition(sessionId: string, next: SessionStatus, error?: string): void {
    const current = this.getById(sessionId);
    if (!current) {
      return;
    }

    if (current.status === next) {
      if (error) {
        this.patch(sessionId, { error });
      }
      return;
    }

    this.stateMachine.assertTransition(current.status, next);
    const patchValue: Partial<SessionRecord> = {
      status: next
    };
    if (error) {
      patchValue.error = error;
    }
    this.patch(sessionId, patchValue);
    this.events.emit("session.transition", {
      sessionId,
      from: current.status,
      to: next
    });
  }

  private patch(sessionId: string, patchValue: Partial<SessionRecord>): void {
    const sessions = this.store.load();
    const updated = sessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      return {
        ...session,
        ...patchValue,
        updatedAt: new Date().toISOString()
      };
    });
    this.store.save(updated);

    const current = updated.find((session) => session.id === sessionId);
    if (current) {
      this.events.emit("session.updated", { record: current });
    }
  }
}

const KILL_WAIT_MS = 3000;

/**
 * Send SIGTERM, wait up to KILL_WAIT_MS for the process to exit,
 * then escalate to SIGKILL if still alive. Cross-process safe.
 */
async function killProcessWithEscalation(pid: number): Promise<void> {
  // Check if process exists at all
  try {
    process.kill(pid, 0);
  } catch {
    // Already dead — nothing to do
    return;
  }

  // Send SIGTERM
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process died between check and kill — fine
    return;
  }

  // Wait for process to exit, polling every 100ms
  const deadline = Date.now() + KILL_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      process.kill(pid, 0);
    } catch {
      // Process is dead — SIGTERM worked
      return;
    }
  }

  // Still alive — escalate to SIGKILL
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Process died during escalation window — acceptable
  }
}
