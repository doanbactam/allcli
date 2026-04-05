import { resolve } from "node:path";
import type { GateName, GateRunSummary, SessionRecord } from "@allcli/core";
import type { EventMap } from "@allcli/core";
import { runGates } from "@allcli/verification";
import { FileManager, RepoRegistry, type FileDirectorySnapshot, type FilePreview, type InboxMessage, type RepoWorkspace, type Task, type Worktree } from "@allcli/workspace";
import type { CliContext } from "./commands/context.js";
import { createCliContext } from "./commands/context.js";

type HubEventType = keyof Pick<EventMap, "session.transition" | "session.updated" | "session.output">;

export interface RepoSummary {
  id: string;
  name: string;
  rootPath: string;
  isDefault: boolean;
  provider: string;
  totalSessions: number;
  activeSessions: number;
  erroredSessions: number;
  taskCount: number;
  addedAt: string;
  lastOpenedAt: string;
}

export interface RepoHubEvent<T extends HubEventType = HubEventType> {
  type: T;
  repoId: string;
  payload: EventMap[T];
}

export class RepoHub {
  readonly defaultRepoId: string;

  private readonly registry: RepoRegistry;
  private readonly contexts = new Map<string, CliContext>();
  private readonly fileManagers = new Map<string, FileManager>();

  constructor(
    controlRoot: string,
    private readonly onEvent?: (event: RepoHubEvent) => void
  ) {
    this.registry = new RepoRegistry(controlRoot);
    this.defaultRepoId = this.registry.ensure(controlRoot).id;
  }

  listRepos(): RepoSummary[] {
    return this.registry.list().map((repo) => this.summarizeRepo(repo));
  }

  addRepo(rootPath: string): RepoSummary {
    const repo = this.registry.add(rootPath);
    return this.summarizeRepo(repo);
  }

  removeRepo(repoId: string): void {
    this.getRepo(repoId);
    if (repoId === this.defaultRepoId) {
      throw new Error("Cannot remove the default repository.");
    }

    this.contexts.delete(repoId);
    this.fileManagers.delete(repoId);
    this.registry.remove(repoId);
  }

  getRepo(repoId: string): RepoWorkspace {
    const repo = this.registry.getById(repoId);
    if (!repo) {
      throw new Error(`Unknown repository: ${repoId}`);
    }

    return repo;
  }

  getContext(repoId: string): CliContext {
    const cached = this.contexts.get(repoId);
    if (cached) {
      return cached;
    }

    const repo = this.getRepo(repoId);
    const context = createCliContext(repo.rootPath);
    this.subscribeToContext(repoId, context);
    this.contexts.set(repoId, context);
    return context;
  }

  getStatus(repoId: string) {
    return this.getContext(repoId).manager.status();
  }

  listSessions(repoId: string): SessionRecord[] {
    return this.getContext(repoId).manager.list();
  }

  async killSession(repoId: string, sessionId: string): Promise<void> {
    await this.getContext(repoId).manager.kill(sessionId);
  }

  listTasks(repoId: string): Task[] {
    return this.getContext(repoId).taskTracker.list();
  }

  createTask(repoId: string, options: {
    title: string;
    description?: string;
    priority?: number;
    blockedBy?: string[];
    acceptanceCriteria?: string[];
  }): Task {
    return this.getContext(repoId).taskTracker.create(options.title, {
      ...(options.description ? { description: options.description } : {}),
      ...(options.priority !== undefined ? { priority: options.priority } : {}),
      ...(options.blockedBy ? { blockedBy: options.blockedBy } : {}),
      ...(options.acceptanceCriteria ? { acceptanceCriteria: options.acceptanceCriteria } : {})
    });
  }

  async listWorktrees(repoId: string): Promise<Worktree[]> {
    return this.getContext(repoId).worktreeManager.list();
  }

  async createWorktree(repoId: string, name: string): Promise<Worktree> {
    const context = this.getContext(repoId);
    return context.worktreeManager.create({
      name,
      baseBranch: context.config.workspace.baseBranch,
      isolated: context.config.workspace.isolation === "worktree"
    });
  }

  async listInbox(repoId: string): Promise<InboxMessage[]> {
    return this.getContext(repoId).inbox.peek("*");
  }

  listFiles(repoId: string, directory: string = ""): Promise<FileDirectorySnapshot> {
    return this.getFileManager(repoId).listDirectory(directory);
  }

  readFile(repoId: string, filePath: string): Promise<FilePreview> {
    return this.getFileManager(repoId).readPreview(filePath);
  }

  async runPrompt(repoId: string, task: string): Promise<SessionRecord> {
    const context = this.getContext(repoId);
    const providerConfig = context.config.providers[context.providerName];
    return context.manager.run(task, {
      cwd: context.cwd,
      dangerous: providerConfig.dangerous,
      outputFormat: providerConfig.outputFormat,
      model: providerConfig.model,
      command: providerConfig.command
    });
  }

  async spawnAgent(repoId: string, role: string, task?: string): Promise<SessionRecord> {
    const normalizedRole = role.trim() || "general";
    const prompt = task?.trim()
      ? `You are acting as the ${normalizedRole} agent.\n\n${task.trim()}`
      : `You are acting as the ${normalizedRole} agent. Execute the next useful task for this repository.`;
    return this.runPrompt(repoId, prompt);
  }

  async verify(repoId: string): Promise<GateRunSummary> {
    const context = this.getContext(repoId);
    return runGates(
      { rootPath: resolve(context.cwd), mode: "default" },
      context.config.verification.gates as GateName[]
    );
  }

  private summarizeRepo(repo: RepoWorkspace): RepoSummary {
    const context = this.getContext(repo.id);
    const sessions = context.manager.list();
    const status = context.manager.status();
    const tasks = context.taskTracker.list();

    return {
      id: repo.id,
      name: repo.name,
      rootPath: repo.rootPath,
      isDefault: repo.id === this.defaultRepoId,
      provider: context.providerName,
      totalSessions: sessions.length,
      activeSessions: status.working + status.spawning,
      erroredSessions: status.errored,
      taskCount: tasks.length,
      addedAt: repo.addedAt,
      lastOpenedAt: repo.lastOpenedAt
    };
  }

  private getFileManager(repoId: string): FileManager {
    const cached = this.fileManagers.get(repoId);
    if (cached) {
      return cached;
    }

    const manager = new FileManager(this.getRepo(repoId).rootPath);
    this.fileManagers.set(repoId, manager);
    return manager;
  }

  private subscribeToContext(repoId: string, context: CliContext): void {
    context.manager.events.on("session.transition", (payload) => {
      this.onEvent?.({ type: "session.transition", repoId, payload });
    });
    context.manager.events.on("session.updated", (payload) => {
      this.onEvent?.({ type: "session.updated", repoId, payload });
    });
    context.manager.events.on("session.output", (payload) => {
      this.onEvent?.({ type: "session.output", repoId, payload });
    });
  }
}
