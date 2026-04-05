import { useCallback } from "react";
import { DiffEditor } from "@monaco-editor/react";
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

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">Output</h2>
              <div className="h-72 overflow-hidden rounded-lg border border-border">
                <DiffEditor
                  original={`// Task: ${task.title}\n// Agent: ${task.assignedAgent ?? "Unassigned"}\n// Status: ${task.result.success ? "SUCCESS" : "FAILED"}`}
                  modified={task.result.output ?? task.result.error ?? "No output captured"}
                  language="typescript"
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    renderSideBySide: false,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    lineNumbers: "off",
                    folding: false,
                    overviewRulerBorder: false,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium tabular-nums text-sm">{task.result.duration}ms</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="font-medium tabular-nums text-sm">{task.result.tokensUsed}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-medium text-sm">{task.assignedAgent ?? "Unassigned"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="font-medium text-sm">{new Date(task.updatedAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
