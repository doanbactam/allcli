import { useCallback } from "react";
import { api, type ApiTask } from "@/lib/api-client";
import { useApiData } from "@/hooks/use-api-data";

function hasResult(task: ApiTask): task is ApiTask & { result: NonNullable<ApiTask["result"]> } {
  return task.result !== undefined;
}

export function ReviewPage() {
  const fetchTasks = useCallback(() => api.tasks(), []);
  const { state } = useApiData(fetchTasks, { refreshInterval: 10_000 });

  const tasks = state.status === "success" ? state.data : [];
  const completedTasks = tasks.filter(hasResult);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">Code Review</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Task execution results and output from agent sessions.
        </p>
      </header>

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading results...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">Failed to load results: {state.error}</p>
      )}

      {completedTasks.length === 0 && state.status === "success" && (
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            No completed tasks with results yet. Tasks will appear here once agents finish execution.
          </p>
        </section>
      )}

      {completedTasks.map((task) => (
        <section
          key={task.id}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{task.title}</p>
            <span
              className={
                task.result.success
                  ? "text-xs font-medium text-green-600"
                  : "text-xs font-medium text-destructive"
              }
            >
              {task.result.success ? "SUCCESS" : "FAILED"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">Output</h2>
              <textarea
                readOnly
                value={task.result.output ?? task.result.error ?? "No output captured"}
                className="h-56 resize-none rounded-lg border border-border bg-background p-3 font-mono text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">Details</h2>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-medium tabular-nums">{task.result.duration}ms</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Tokens used:</span>{" "}
                  <span className="font-medium tabular-nums">{task.result.tokensUsed}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Agent:</span>{" "}
                  <span className="font-medium">{task.assignedAgent ?? "Unassigned"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Completed:</span>{" "}
                  <span className="font-medium">{new Date(task.updatedAt).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
