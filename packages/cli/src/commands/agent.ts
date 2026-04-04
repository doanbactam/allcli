import { createCliContext } from "./context.js";
import type { SessionRecord } from "@allcli/core";
import { AgentRouter } from "@allcli/orchestrator";

const STATUS_COLORS: Record<string, string> = {
  spawning: "\x1b[33m", // yellow
  working: "\x1b[36m",  // cyan
  done: "\x1b[32m",     // green
  errored: "\x1b[31m",  // red
  killed: "\x1b[35m"    // magenta
};
const RESET = "\x1b[0m";

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function formatStatus(status: string): string {
  const color = STATUS_COLORS[status] ?? "";
  return `${color}${status}${RESET}`;
}

export function listAgents(cwd: string): void {
  const context = createCliContext(cwd);
  const records = context.manager.list();
  if (records.length === 0) {
    process.stdout.write("No sessions found.\n");
    return;
  }

  for (const record of records) {
    const truncatedTask = record.task.length > 40 ? `${record.task.slice(0, 37)}...` : record.task;
    process.stdout.write(
      `${shortId(record.id)}  ${formatTime(record.updatedAt)}  ${formatStatus(record.status)}  ${record.provider}  pid=${record.pid ?? "n/a"}  ${truncatedTask}\n`
    );
  }
}

export async function killAgent(sessionId: string, cwd: string): Promise<void> {
  const context = createCliContext(cwd);
  try {
    await context.manager.kill(sessionId);
    process.stdout.write(`Killed session ${sessionId}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown kill error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

export function cleanAgents(cwd: string): void {
  const context = createCliContext(cwd);
  const removed = context.manager.clean();
  if (removed > 0) {
    process.stdout.write(`Cleaned ${removed} stale session${removed === 1 ? "" : "s"}.\n`);
  } else {
    process.stdout.write("No stale sessions to clean.\n");
  }
}

export async function spawnAgent(role: string, cwd: string, options?: { task?: string }): Promise<void> {
  const context = createCliContext(cwd);
  const task = options?.task ?? `Execute ${role} agent`;

  // Use AgentRouter to validate/enhance the role
  const router = new AgentRouter();
  const route = router.route(task);
  process.stdout.write(
    `Spawning agent: ${role}\n  routed role: ${route.role} (confidence: ${(route.confidence * 100).toFixed(0)}%)\n  task: ${task}\n`
  );

  try {
    const session = await context.manager.run(task, {
      cwd: context.cwd,
      dangerous: context.config.providers[context.providerName].dangerous,
      outputFormat: context.config.providers[context.providerName].outputFormat,
      model: context.config.providers[context.providerName].model
    });

    process.stdout.write(`  session: ${session.id.slice(0, 8)}\n  status: ${session.status}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown spawn error";
    process.stderr.write(`Failed to spawn agent: ${message}\n`);
    process.exitCode = 1;
  }
}
