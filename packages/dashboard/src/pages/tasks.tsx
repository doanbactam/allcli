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

const dotColor: Record<ApiTaskStatus, string> = {
  pending: "bg-warning",
  in_progress: "bg-primary",
  blocked: "bg-danger",
  completed: "bg-success",
  failed: "bg-danger",
};

function TaskCardSkeleton() {
  return (
    <div className="border border-border/50 bg-surface-0 px-2.5 py-2">
      <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
      <div className="mt-1.5 h-2.5 w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-2 flex justify-between">
        <div className="h-2.5 w-16 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-8 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const level = priority >= 8 ? "high" : priority >= 4 ? "medium" : "low";
  const colors = {
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-warning",
    low: "bg-surface-2 text-subtext",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1 py-px text-[9px] font-bold tabular-nums",
        colors[level],
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
    <div className="flex flex-col gap-3 animate-fade-in">
      {isLoading && (
        <section className="grid grid-cols-5 gap-2">
          {columns.map((column) => (
            <div
              key={column.status}
              className="flex min-h-60 flex-col border border-border bg-surface-1"
            >
              <div className="flex items-center justify-between border-b border-border px-2 py-1">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-4 animate-pulse rounded bg-surface-2" />
              </div>
              <div className="flex flex-col gap-1.5 p-1.5">
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </div>
            </div>
          ))}
        </section>
      )}

      {hasError && (
        <div className="flex items-center gap-2 border border-danger/30 bg-danger/5 px-3 py-3 text-xs text-danger">
          <span className="size-1.5 rounded-full bg-danger" />
          Failed to load tasks. Retrying...
        </div>
      )}

      {!isLoading && !hasError && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 border border-border bg-surface-1 py-8">
          <ListTodo className="size-4 text-subtext" />
          <div className="flex flex-col gap-0.5 text-center">
            <p className="text-xs text-foreground">No tasks yet</p>
            <p className="text-[10px] text-subtext">Create a task to start tracking execution progress.</p>
          </div>
        </div>
      )}

      {!isLoading && !hasError && tasks.length > 0 && (
        <section className="grid grid-cols-5 gap-2">
          {columnsWithTasks.map((column) => {
            return (
              <div
                key={column.status}
                className="flex min-h-60 flex-col border border-border bg-surface-1"
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-border px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", dotColor[column.status])} />
                    <span className="text-[11px] font-medium text-foreground">{column.label}</span>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-subtext">
                    {column.tasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-1.5">
                  {column.tasks.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-4">
                      <span className="text-[10px] text-subtext/40">Empty</span>
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="border border-border/50 bg-surface-0 px-2.5 py-2 transition-colors hover:border-border hover:bg-surface-0/80"
                      >
                        <h3 className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-1 text-[10px] leading-tight text-subtext line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="max-w-[80px] truncate text-[10px] text-subtext font-mono">
                            {task.assignedAgent ?? "---"}
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
