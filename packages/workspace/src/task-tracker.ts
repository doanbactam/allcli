import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { JsonFileStore } from "@allcli/core";
import type { Task, TaskResult } from "./types.js";

export class TaskTracker {
  private readonly store: JsonFileStore<Task>;

  constructor(
    private readonly workspaceRoot: string,
    private readonly stateFilePath = resolve(workspaceRoot, ".allcli", "tasks.json")
  ) {
    this.store = new JsonFileStore<Task>(stateFilePath);
  }

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

    const tasks = this.store.load();
    tasks.push(task);
    this.store.save(tasks);
    return task;
  }

  list(filter?: { status?: Task["status"]; assignedAgent?: string }): Task[] {
    const tasks = this.store.load();
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
    return this.store.load().find((task) => task.id === id || task.id.startsWith(id));
  }

  private findTaskIndex(id: string): number {
    const tasks = this.store.load();
    return tasks.findIndex((task) => task.id === id || task.id.startsWith(id));
  }

  update(id: string, patch: Partial<Task>): Task {
    const tasks = this.store.load();
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
    this.store.save(tasks);
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
    const tasks = this.store.load();
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
}
