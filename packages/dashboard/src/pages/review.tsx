import { useCallback } from "react";
import { ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { api, type ApiTask } from "@/lib/api-client";
import { useApiData } from "@/hooks/use-api-data";
import { cn } from "@/lib/utils";

function hasResult(task: ApiTask): task is ApiTask & { result: NonNullable<ApiTask["result"]> } {
  return task.result !== undefined;
}

export function ReviewPage() {
  const fetchTasks = useCallback(() => api.tasks(), []);
  const { state } = useApiData(fetchTasks, { refreshInterval: 10_000 });

  const tasks = state.status === "success" ? state.data : [];
  const completedTasks = tasks.filter(hasResult);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {state.status === "loading" && (
        <div className="flex items-center gap-2 py-4 text-xs text-subtext">
          <span className="size-1.5 animate-pulse rounded-full bg-subtext" />
          Loading results...
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-center gap-2 border border-danger/30 bg-danger/5 px-3 py-3 text-xs text-danger">
          <span className="size-1.5 rounded-full bg-danger" />
          Failed to load results: {state.error}
        </div>
      )}

      {completedTasks.length === 0 && state.status === "success" && (
        <div className="border border-border bg-surface-1 px-3 py-6 text-xs text-subtext">
          No completed tasks with results yet. Tasks will appear here once agents finish execution.
        </div>
      )}

      {completedTasks.map((task) => (
        <section
          key={task.id}
          className="border border-border bg-surface-1"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronRight className="size-3 shrink-0 text-subtext" />
              <span className="truncate text-xs font-medium text-foreground">{task.title}</span>
            </div>
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                task.result.success ? "text-success" : "text-danger",
              )}
            >
              {task.result.success ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
              {task.result.success ? "PASS" : "FAIL"}
            </span>
          </div>

          {/* Content — split output/details */}
          <div className="grid grid-cols-1 gap-px bg-border xl:grid-cols-2">
            {/* Output — terminal style */}
            <div className="bg-surface-0">
              <div className="flex items-center border-b border-border px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-subtext">
                  Output
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto p-3">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80">
                  {task.result.output ?? task.result.error ?? "No output captured"}
                </pre>
              </div>
            </div>

            {/* Details — key-value pairs */}
            <div className="bg-surface-0">
              <div className="flex items-center border-b border-border px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-subtext">
                  Details
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border/50">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] text-subtext">Duration</span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground">
                    {task.result.duration}ms
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] text-subtext">Tokens</span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground">
                    {task.result.tokensUsed}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] text-subtext">Agent</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {task.assignedAgent ?? "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] text-subtext">Completed</span>
                  <span className="text-[11px] text-foreground">
                    {new Date(task.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
