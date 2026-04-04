import { createCliContext } from "./context.js";
import { TaskDecomposer } from "@allcli/orchestrator";

export function createTask(
  description: string,
  cwd: string,
  options?: { priority?: number; blockedBy?: string[] }
): void {
  const context = createCliContext(cwd);
  const task = context.taskTracker.create(description, {
    ...(options?.priority !== undefined ? { priority: options.priority } : {}),
    ...(options?.blockedBy ? { blockedBy: options.blockedBy } : {})
  });
  process.stdout.write(
    `Created task: ${task.id.slice(0, 8)}\n  title: ${task.title}\n  status: ${task.status}\n  priority: ${task.priority}\n`
  );
  if (task.blockedBy.length > 0) {
    process.stdout.write(`  blocked by: ${task.blockedBy.map((id) => id.slice(0, 8)).join(", ")}\n`);
  }
}

export function listTasks(cwd: string, filterStatus?: string): void {
  const context = createCliContext(cwd);
  const tasks = context.taskTracker.list(
    filterStatus ? { status: filterStatus as "pending" | "in_progress" | "completed" | "blocked" | "failed" } : undefined
  );
  if (tasks.length === 0) {
    process.stdout.write("No tasks found.\n");
    return;
  }

  for (const task of tasks) {
    const shortId = task.id.slice(0, 8);
    const statusIcon =
      task.status === "completed" ? "\u2713" :
      task.status === "failed" ? "\u2717" :
      task.status === "blocked" ? "\u25D0" :
      task.status === "in_progress" ? "\u25B6" : "\u25CB";
    process.stdout.write(
      `${statusIcon} ${shortId}  [${task.priority}]  ${task.status}  ${task.title}\n`
    );
  }
}

export function decomposeTask(taskId: string, cwd: string): void {
  const context = createCliContext(cwd);
  const decomposer = new TaskDecomposer();

  const task = context.taskTracker.getById(taskId);
  if (!task) {
    process.stderr.write(`Task not found: ${taskId}\n`);
    process.exitCode = 1;
    return;
  }

  const result = decomposer.decompose(task.title, task.description);
  const subtasks = context.taskTracker.decompose(
    taskId,
    result.subtasks.map((s) => ({
      title: s.title,
      description: s.description,
      priority: s.priority
    }))
  );

  process.stdout.write(`Decomposed task ${taskId.slice(0, 8)} into ${subtasks.length} subtasks:\n`);
  process.stdout.write(`  Strategy: ${result.strategy}\n`);
  for (const subtask of subtasks) {
    process.stdout.write(`  - ${subtask.id.slice(0, 8)}  ${subtask.title}\n`);
  }
}

export function taskStatus(taskId: string, cwd: string): void {
  const context = createCliContext(cwd);
  const task = context.taskTracker.getById(taskId);
  if (!task) {
    process.stderr.write(`Task not found: ${taskId}\n`);
    process.exitCode = 1;
    return;
  }

  const ready = context.taskTracker.resolveDependencies();
  const isReady = ready.some((t) => t.id === task.id);

  process.stdout.write(
    [
      `Task: ${task.title}`,
      `  id: ${task.id.slice(0, 8)}`,
      `  status: ${task.status}`,
      `  priority: ${task.priority}`,
      `  ready: ${isReady}`,
      `  blocked by: ${task.blockedBy.length > 0 ? task.blockedBy.map((id) => id.slice(0, 8)).join(", ") : "none"}`,
      task.assignedAgent ? `  agent: ${task.assignedAgent}` : "",
      task.worktreeId ? `  worktree: ${task.worktreeId.slice(0, 8)}` : "",
      task.result ? `  result: ${task.result.success ? "success" : "failed"} (${task.result.duration}ms)` : ""
    ].filter(Boolean).join("\n") + "\n"
  );
}
