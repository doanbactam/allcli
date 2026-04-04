import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Task, TaskResult } from "./types.js";

export class TaskTracker {
  constructor(
    private readonly workspaceRoot: string,
    private readonly stateFilePath = resolve(workspaceRoot, ".allcli", "tasks.json")
  ) {}

  create(
    title: string,
    options?: {
      description?: string;
      priority?: number;
      blockedBy?: string[];
      acceptanceCriteria?: string[];
    }
  ): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title,
      description: options?.description ?? "",
      status: "pending",
      priority: options?.priority ?? 0,
      blockedBy: options?.blockedBy ?? [],
      acceptanceCriteria: options?.acceptanceCriteria ?? [],
      createdAt: now,
      updatedAt: now
    };

    const tasks = this.loadTasks();
    tasks.push(task);
    this.saveTasks(tasks);
    return task;
  }

  list(filter?: { status?: Task["status"]; assignedAgent?: string }): Task[] {
    const tasks = this.loadTasks();
    return tasks.filter((task) => {
      if (filter?.status && task.status !== filter.status) {
        return false;
      }

      if (filter?.assignedAgent && task.assignedAgent !== filter.assignedAgent) {
        return false;
      }

      return true;
    });
  }

  getById(id: string): Task | undefined {
    return this.loadTasks().find((task) => task.id === id || task.id.startsWith(id));
  }

  private findTaskIndex(id: string): number {
    const tasks = this.loadTasks();
    return tasks.findIndex((task) => task.id === id || task.id.startsWith(id));
  }

  update(id: string, patch: Partial<Task>): Task {
    const tasks = this.loadTasks();
    const index = this.findTaskIndex(id);
    if (index < 0) {
      throw new Error(`Task not found: ${id}`);
    }

    const current = tasks[index] as Task;
    const updated: Task = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    };

    tasks[index] = updated;
    this.saveTasks(tasks);
    return updated;
  }

  decompose(
    parentId: string,
    subtasks: Array<{ title: string; description?: string; priority?: number }>
  ): Task[] {
    const parent = this.getById(parentId);
    if (!parent) {
      throw new Error(`Task not found: ${parentId}`);
    }

    const created: Task[] = [];
    for (const subtask of subtasks) {
      created.push(
        this.create(subtask.title, {
          ...(subtask.description ? { description: subtask.description } : {}),
          ...(subtask.priority !== undefined ? { priority: subtask.priority } : {}),
          blockedBy: [parentId]
        })
      );
    }

    return created;
  }

  resolveDependencies(): Task[] {
    const tasks = this.loadTasks();
    const byId = new Map(tasks.map((task) => [task.id, task]));

    return tasks
      .filter((task) => task.status === "pending")
      .filter((task) => task.blockedBy.every((dependencyId) => byId.get(dependencyId)?.status === "completed"))
      .sort((a, b) => b.priority - a.priority);
  }

  complete(id: string, result: TaskResult): Task {
    return this.update(id, {
      status: "completed",
      result
    });
  }

  private loadTasks(): Task[] {
    if (!existsSync(this.stateFilePath)) {
      return [];
    }

    const raw = readFileSync(this.stateFilePath, "utf8");
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Task[];
  }

  private saveTasks(tasks: Task[]): void {
    const absolute = resolve(this.stateFilePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(tasks, null, 2));
  }
}
