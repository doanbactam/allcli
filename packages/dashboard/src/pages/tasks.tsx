import { useCallback, useMemo } from "react";
import { AlertCircle, CheckCircle2, Clock, ListTodo, XCircle } from "lucide-react";
import { api, type ApiTaskStatus } from "@/lib/api-client";
import { useApiData } from "@/hooks/use-api-data";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

const columns: { status: ApiTaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "in_progress", label: "In Progress", icon: ListTodo },
  { status: "blocked", label: "Blocked", icon: AlertCircle },
  { status: "completed", label: "Completed", icon: CheckCircle2 },
  { status: "failed", label: "Failed", icon: XCircle },
];

const columnAccent: Record<ApiTaskStatus, string> = {
  pending: "border-t-warning/50",
  in_progress: "border-t-primary/50",
  blocked: "border-t-danger/50",
  completed: "border-t-success/50",
  failed: "border-t-danger/50",
};

const headerColor: Record<ApiTaskStatus, string> = {
  pending: "text-warning",
  in_progress: "text-primary",
  blocked: "text-danger",
  completed: "text-success",
  failed: "text-danger",
};

function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/60" />
      <div className="mt-3 flex justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
        <div className="h-5 w-10 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const level = priority >= 8 ? "high" : priority >= 4 ? "medium" : "low";
  const colors = {
    high: "bg-danger/15 text-danger border-danger/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    low: "bg-muted/50 text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        colors[level]
      )}
    >
      P{priority}
    </span>
  );
}

export function TasksPage() {
  const fetchTasks = useCallback(() => api.tasks(), []);
  const { state, refresh } = useApiData(fetchTasks, { refreshInterval: 5_000 });

  useWebSocket({
    onEvent: (event) => {
      if (event.type === "session.updated") {
        refresh();
      }
    },
  });

  const tasks = state.status === "success" ? state.data : [];
  const isLoading = state.status === "loading";
  const hasError = state.status === "error";

  const columnsWithTasks = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      tasks: tasks.filter((task) => task.status === column.status),
    }));
  }, [tasks]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-balance">Tasks</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Kanban view of the AI execution pipeline across repositories and agents.
        </p>
      </header>

      {isLoading && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {columns.map((column) => (
            <div
              key={column.status}
              className={cn(
                "flex min-h-80 flex-col gap-3 rounded-xl border border-t-2 bg-card p-4",
                columnAccent[column.status]
              )}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-6 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex flex-col gap-3">
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </div>
            </div>
          ))}
        </section>
      )}

      {hasError && (
        <div className="flex items-center justify-center rounded-xl border border-danger/30 bg-danger/5 py-12 text-sm text-danger">
          Failed to load tasks. Retrying...
        </div>
      )}

      {!isLoading && !hasError && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/40 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <ListTodo className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs text-muted-foreground">
              Create a task to start tracking execution progress.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !hasError && tasks.length > 0 && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {columnsWithTasks.map((column) => {
            const Icon = column.icon;
            return (
              <div
                key={column.status}
                className={cn(
                  "flex min-h-80 flex-col gap-3 rounded-xl border border-t-2 bg-card p-4",
                  columnAccent[column.status]
                )}
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", headerColor[column.status])} />
                    <h2 className="text-sm font-semibold">{column.label}</h2>
                  </div>
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted/50 text-[10px] font-bold tabular-nums">
                    {column.tasks.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                  {column.tasks.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-8">
                      <span className="text-xs text-muted-foreground/50">No tasks</span>
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="rounded-lg border border-border/50 bg-background/60 p-3 transition-colors hover:border-border hover:bg-background/80"
                      >
                        <h3 className="text-sm font-medium line-clamp-2">{task.title}</h3>
                        {task.description && (
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                            {task.assignedAgent ?? "Unassigned"}
                          </span>
                          <PriorityBadge priority={task.priority} />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
