import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SummaryCard } from "@/components/summary-card";
import { api, type ApiTask } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import { useApiData } from "@/hooks/use-api-data";

/** Rough cost per 1K tokens (USD) — varies by model, this is an estimate */
const COST_PER_1K_TOKENS = 0.003;

function hasResult(task: ApiTask): task is ApiTask & { result: NonNullable<ApiTask["result"]> } {
  return task.result !== undefined;
}

export function CostsPage() {
  const fetchTasks = useCallback(() => api.tasks(), []);
  const { state } = useApiData(fetchTasks, { refreshInterval: 10_000 });

  const tasks = state.status === "success" ? state.data : [];
  const tasksWithResults = tasks.filter(hasResult);

  const stats = useMemo(() => {
    const totalTokens = tasksWithResults.reduce((sum, t) => sum + t.result.tokensUsed, 0);
    const totalDuration = tasksWithResults.reduce((sum, t) => sum + t.result.duration, 0);
    const estimatedCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    return {
      totalTokens,
      totalDuration,
      estimatedCost,
      taskCount: tasksWithResults.length,
    };
  }, [tasksWithResults]);

  const chartData = useMemo(() => {
    if (tasksWithResults.length === 0) return [];

    // Group by date
    const byDate = new Map<string, { tokens: number; tasks: number }>();
    for (const task of tasksWithResults) {
      const date = new Date(task.updatedAt).toLocaleDateString(undefined, { weekday: "short" });
      const existing = byDate.get(date) ?? { tokens: 0, tasks: 0 };
      existing.tokens += task.result.tokensUsed;
      existing.tasks += 1;
      byDate.set(date, existing);
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      tokens: data.tokens,
      estimatedCost: Number(((data.tokens / 1000) * COST_PER_1K_TOKENS).toFixed(2)),
      tasks: data.tasks,
    }));
  }, [tasksWithResults]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">Costs</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Token usage and estimated cost breakdown across provider sessions.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Tokens"
          value={formatNumber(stats.totalTokens)}
          subtitle={`Across ${stats.taskCount} completed tasks`}
        />
        <SummaryCard
          title="Estimated Cost"
          value={`$${stats.estimatedCost.toFixed(2)}`}
          subtitle={`At ~$${COST_PER_1K_TOKENS}/1K tokens`}
        />
        <SummaryCard
          title="Total Duration"
          value={`${(stats.totalDuration / 1000).toFixed(1)}s`}
          subtitle="Combined execution time"
        />
      </section>

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading cost data...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">Failed to load cost data: {state.error}</p>
      )}

      {chartData.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tokens" stroke="var(--primary)" name="Tokens" />
                <Line
                  type="monotone"
                  dataKey="estimatedCost"
                  stroke="var(--muted-foreground)"
                  name="Est. Cost ($)"
                />
                <Line type="monotone" dataKey="tasks" stroke="var(--foreground)" name="Tasks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        state.status === "success" && (
          <section className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              No cost data yet. Complete tasks with agents to see usage trends.
            </p>
          </section>
        )
      )}
    </div>
  );
}
