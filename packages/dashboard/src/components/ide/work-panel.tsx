import { useMemo, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import { LoaderCircle, Plus, TreePine, ListTodo } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { api } from "@/lib/api-client";
import { buildTaskCreatePayload, getTaskDependencyState, sortTasksForDisplay, sortWorktreesForDisplay, suggestWorktreeName } from "@/lib/work-surface";
import { formatTimeAgo } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { PanelShell } from "./panel-shell";

interface WorkPanelProps {
  repoId: string | null;
  onRepoMutation: () => void;
}

export function WorkPanel({ repoId, onRepoMutation }: WorkPanelProps) {
  const tasksQuery = useLiveData(() => api.repoTasks(repoId as string), {
    enabled: Boolean(repoId),
    refreshInterval: 5000,
  });
  const worktreesQuery = useLiveData(() => api.repoWorktrees(repoId as string), {
    enabled: Boolean(repoId),
    refreshInterval: 5000,
  });

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("0");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [worktreeName, setWorktreeName] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [worktreeBusy, setWorktreeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasks = useMemo(() => sortTasksForDisplay(tasksQuery.state.data ?? []), [tasksQuery.state.data]);
  const worktrees = useMemo(() => sortWorktreesForDisplay(worktreesQuery.state.data ?? []), [worktreesQuery.state.data]);

  const createTask = async () => {
    if (!repoId) {
      return;
    }

    try {
      setTaskBusy(true);
      setError(null);
      await api.createRepoTask(repoId, buildTaskCreatePayload({
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        blockedBy,
        acceptanceCriteria
      }));
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("0");
      setAcceptanceCriteria("");
      setBlockedBy([]);
      await tasksQuery.refresh();
      onRepoMutation();
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Failed to create task.");
    } finally {
      setTaskBusy(false);
    }
  };

  const createWorktree = async () => {
    if (!repoId) {
      return;
    }
    if (!worktreeName.trim()) {
      setError("Worktree name is required.");
      return;
    }

    try {
      setWorktreeBusy(true);
      setError(null);
      await api.createRepoWorktree(repoId, worktreeName.trim());
      setWorktreeName("");
      await worktreesQuery.refresh();
      onRepoMutation();
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Failed to create worktree.");
    } finally {
      setWorktreeBusy(false);
    }
  };

  return (
    <PanelShell
      title="Work Surface"
      subtitle="Create tasks, inspect worktrees, and keep repo execution grounded in real artifacts."
      bodyClassName="min-h-0"
    >
      <Tabs.Root defaultValue="tasks" className="flex h-full min-h-0 flex-col">
        <Tabs.List className="flex border-b border-border/70 px-3 pt-2">
          {[
            { value: "tasks", label: `Tasks${tasksQuery.state.refreshing ? " · Refreshing" : ""}` },
            { value: "worktrees", label: `Worktrees${worktreesQuery.state.refreshing ? " · Refreshing" : ""}` },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="rounded-t-lg border border-b-0 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {error ? <div className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-xs text-danger">{error}</div> : null}

        <Tabs.Content value="tasks" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 outline-none">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_160px_auto]">
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <input
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder="Description (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
            >
              <option value="0">Priority 0</option>
              <option value="1">Priority 1</option>
              <option value="2">Priority 2</option>
              <option value="3">Priority 3</option>
            </select>
            <button
              type="button"
              onClick={() => {
                void createTask();
              }}
              disabled={taskBusy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {taskBusy ? <LoaderCircle className="size-4" /> : <Plus className="size-4" />}
              Create Task
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
            <textarea
              value={acceptanceCriteria}
              onChange={(event) => setAcceptanceCriteria(event.target.value)}
              placeholder="Acceptance criteria, one item per line"
              className="min-h-[96px] resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <div className="rounded-xl border border-border/70 bg-background/45 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Blockers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tasks.filter((task) => task.status !== "completed").length > 0 ? (
                  tasks
                    .filter((task) => task.status !== "completed")
                    .map((task) => {
                      const checked = blockedBy.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setBlockedBy((previous) =>
                              checked ? previous.filter((item) => item !== task.id) : [...previous, task.id]
                            );
                          }}
                          className={checked
                            ? "rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                            : "rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {task.title}
                        </button>
                      );
                    })
                ) : (
                  <p className="text-sm text-muted-foreground">No open tasks available as blockers.</p>
                )}
              </div>
            </div>
          </div>

          <ScrollArea.Root className="min-h-0 flex-1">
            <ScrollArea.Viewport className="h-full">
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const dependencyState = getTaskDependencyState(task, tasks);
                  return (
                  <article key={task.id} className="rounded-xl border border-border/70 bg-background/45 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold line-clamp-2">{task.title}</p>
                        {task.description ? (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={task.status} />
                        <span className={
                          dependencyState.tone === "success"
                            ? "rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                            : dependencyState.tone === "danger"
                              ? "rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                              : dependencyState.tone === "warning"
                                ? "rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                                : "rounded-md border border-border/70 bg-background/70 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }>
                          {dependencyState.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-md border border-border/60 px-2 py-1 font-mono">P{task.priority}</span>
                      <span className="rounded-md border border-border/60 px-2 py-1">{formatTimeAgo(task.updatedAt)}</span>
                      <span className="rounded-md border border-border/60 px-2 py-1">{task.blockedBy.length} blockers</span>
                      <span className="rounded-md border border-border/60 px-2 py-1">{task.acceptanceCriteria.length} criteria</span>
                    </div>
                    {task.acceptanceCriteria.length > 0 ? (
                      <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
                        {task.acceptanceCriteria.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );})}
                {repoId && !tasksQuery.state.refreshing && tasks.length === 0 ? (
                  <EmptySurface icon={<ListTodo className="size-5" />} message="No tasks yet for this repository." />
                ) : null}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
              <ScrollArea.Thumb className="rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Content>

        <Tabs.Content value="worktrees" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 outline-none">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={worktreeName}
              onChange={(event) => setWorktreeName(event.target.value)}
              placeholder="feature/session-name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <button
              type="button"
              onClick={() => setWorktreeName(suggestWorktreeName(taskTitle))}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
            >
              From Task Title
            </button>
            <button
              type="button"
              onClick={() => {
                void createWorktree();
              }}
              disabled={worktreeBusy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {worktreeBusy ? <LoaderCircle className="size-4" /> : <TreePine className="size-4" />}
              Create Worktree
            </button>
          </div>

          <ScrollArea.Root className="min-h-0 flex-1">
            <ScrollArea.Viewport className="h-full">
              <div className="flex flex-col gap-2">
                {worktrees.map((worktree) => (
                  <article key={worktree.id} className="rounded-xl border border-border/70 bg-background/45 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{worktree.name}</p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{worktree.branch}</p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{worktree.path}</p>
                      </div>
                      <StatusBadge status={worktree.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-md border border-border/60 px-2 py-1">Created {formatTimeAgo(worktree.createdAt)}</span>
                    </div>
                  </article>
                ))}
                {repoId && !worktreesQuery.state.refreshing && worktrees.length === 0 ? (
                  <EmptySurface icon={<TreePine className="size-5" />} message="No worktrees are registered for this repository." />
                ) : null}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
              <ScrollArea.Thumb className="rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Content>
      </Tabs.Root>
    </PanelShell>
  );
}

function EmptySurface({ icon, message }: { icon: React.JSX.Element; message: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/40 px-4 text-center text-sm text-muted-foreground">
      <div className="flex size-11 items-center justify-center rounded-full border border-border bg-card">{icon}</div>
      <p className="max-w-md text-pretty">{message}</p>
    </div>
  );
}
