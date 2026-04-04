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
import { ChevronRight } from "lucide-react";
import { SummaryCard } from "@/components/summary-card";
import { api, type ApiTask } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import { useApiData } from "@/hooks/use-api-data";

/** Rough cost per 1K tokens (USD) */
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
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Summary cards */}
      <section className="grid grid-cols-3 gap-2">
        <SummaryCard
          title="Total Tokens"
          value={formatNumber(stats.totalTokens)}
          subtitle={`${stats.taskCount} tasks`}
        />
        <SummaryCard
          title="Est. Cost"
          value={`$${stats.estimatedCost.toFixed(2)}`}
          subtitle={`~$${COST_PER_1K_TOKENS}/1K tok`}
        />
        <SummaryCard
          title="Duration"
          value={`${(stats.totalDuration / 1000).toFixed(1)}s`}
          subtitle="Total exec time"
        />
      </section>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 py-4 text-xs text-subtext">
          <span className="size-1.5 animate-pulse rounded-full bg-subtext" />
          Loading cost data...
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-center gap-2 border border-danger/30 bg-danger/5 px-3 py-3 text-xs text-danger">
          <span className="size-1.5 rounded-full bg-danger" />
          Failed to load cost data: {state.error}
        </div>
      )}

      {chartData.length > 0 ? (
        <section className="border border-border bg-surface-1">
          {/* Panel header */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
            <ChevronRight className="size-3 text-subtext" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
              Usage Over Time
            </span>
          </div>
          <div className="h-72 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#313244"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6c7086", fontSize: 10 }}
                  axisLine={{ stroke: "#313244" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6c7086", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#181825",
                    border: "1px solid #313244",
                    borderRadius: "2px",
                    fontSize: "11px",
                    color: "#cdd6f4",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", color: "#6c7086" }}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#89b4fa"
                  name="Tokens"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedCost"
                  stroke="#6c7086"
                  name="Est. Cost ($)"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="#cba6f7"
                  name="Tasks"
                  dot={false}
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        state.status === "success" && (
          <div className="border border-border bg-surface-1 px-3 py-6 text-xs text-subtext">
            No cost data yet. Complete tasks with agents to see usage trends.
          </div>
        )
      )}
    </div>
  );
}
