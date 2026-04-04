import { useCallback } from "react";
import { Activity, Bot, CheckCircle2, Cpu } from "lucide-react";
import { SummaryCard, SummaryCardSkeleton } from "@/components/summary-card";
import { StatusBadge } from "@/components/status-badge";
import { api, type ApiSession } from "@/lib/api-client";
import { useApiData } from "@/hooks/use-api-data";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatTimeAgo } from "@/lib/utils";

function sessionToBadgeStatus(session: ApiSession): "running" | "completed" | "failed" {
  if (session.status === "done" || session.status === "merged") return "completed";
  if (session.status === "errored" || session.status === "killed") return "failed";
  return "running";
}

function SessionItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function DashboardHome() {
  const fetchSessions = useCallback(() => api.sessions(), []);
  const fetchStatus = useCallback(() => api.status(), []);

  const { state: sessionsState, refresh: refreshSessions } = useApiData(fetchSessions, {
    refreshInterval: 5000,
  });
  const { state: statusState } = useApiData(fetchStatus, { refreshInterval: 5000 });

  useWebSocket({
    onEvent: () => {
      refreshSessions();
    },
  });

  const sessions = sessionsState.status === "success" ? sessionsState.data : [];
  const status = statusState.status === "success" ? statusState.data : null;
  const activeAgents = status ? status.status.working + status.status.spawning : 0;
  const completedTasks = status?.status.done ?? 0;
  const isLoading = sessionsState.status === "loading" || statusState.status === "loading";
  const hasError = sessionsState.status === "error" || statusState.status === "error";
  const errorMessage =
    sessionsState.status === "error"
      ? sessionsState.error
      : statusState.status === "error"
        ? statusState.error
        : null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-balance">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Monitor autonomous AI agent sessions and execution progress.
        </p>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              title="Total Sessions"
              value={status ? String(status.status.total) : "---"}
              subtitle="Across active and completed runs"
              icon={<Activity className="size-5" />}
            />
            <SummaryCard
              title="Active Agents"
              value={String(activeAgents)}
              subtitle="Currently executing tasks"
              icon={<Bot className="size-5" />}
            />
            <SummaryCard
              title="Tasks Completed"
              value={String(completedTasks)}
              subtitle="Delivered in current sprint"
              icon={<CheckCircle2 className="size-5" />}
            />
            <SummaryCard
              title="Provider"
              value={status?.provider ?? "---"}
              subtitle="Default AI provider"
              icon={<Cpu className="size-5" />}
            />
          </>
        )}
      </section>

      {/* Recent Activity */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </h2>

        {isLoading && (
          <div className="flex flex-col gap-2">
            <SessionItemSkeleton />
            <SessionItemSkeleton />
            <SessionItemSkeleton />
          </div>
        )}

        {hasError && (
          <div className="flex items-center justify-center rounded-lg border border-danger/30 bg-danger/5 py-8 text-sm text-danger">
            Failed to load: {errorMessage}
          </div>
        )}

        {!isLoading && !hasError && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">No sessions yet</p>
              <p className="text-xs text-muted-foreground">
                Run a task to get started.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !hasError && sessions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-4 py-3 transition-colors hover:border-border"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{session.task}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.provider} · {formatTimeAgo(session.createdAt)}
                  </p>
                </div>
                <StatusBadge status={sessionToBadgeStatus(session)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
