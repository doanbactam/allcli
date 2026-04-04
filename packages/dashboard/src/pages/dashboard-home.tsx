import { useCallback } from "react";
import { Activity, Bot, CheckCircle2, Cpu, ChevronRight } from "lucide-react";
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
    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="h-3.5 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-2.5 w-32 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
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
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Summary Cards — compact row */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
              title="Sessions"
              value={status ? String(status.status.total) : "---"}
              subtitle="Total runs"
              icon={<Activity className="size-4" />}
            />
            <SummaryCard
              title="Active"
              value={String(activeAgents)}
              subtitle="Executing"
              icon={<Bot className="size-4" />}
            />
            <SummaryCard
              title="Completed"
              value={String(completedTasks)}
              subtitle="Delivered"
              icon={<CheckCircle2 className="size-4" />}
            />
            <SummaryCard
              title="Provider"
              value={status?.provider ?? "---"}
              subtitle="Default"
              icon={<Cpu className="size-4" />}
            />
          </>
        )}
      </section>

      {/* Recent Activity — terminal/output panel style */}
      <section className="flex flex-col border border-border bg-surface-1">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex items-center gap-2">
            <ChevronRight className="size-3 text-subtext" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
              Recent Activity
            </span>
          </div>
          {sessions.length > 0 && (
            <span className="text-[10px] tabular-nums text-subtext">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col">
            <SessionItemSkeleton />
            <SessionItemSkeleton />
            <SessionItemSkeleton />
          </div>
        )}

        {hasError && (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-danger">
            <span className="size-1.5 rounded-full bg-danger" />
            Failed to load: {errorMessage}
          </div>
        )}

        {!isLoading && !hasError && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Activity className="size-4 text-subtext" />
            <div className="flex flex-col gap-0.5 text-center">
              <p className="text-xs text-foreground">No sessions yet</p>
              <p className="text-[10px] text-subtext">Run a task to get started.</p>
            </div>
          </div>
        )}

        {!isLoading && !hasError && sessions.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {sessions.map((session, i) => (
              <div
                key={session.id}
                className="group flex items-center justify-between gap-3 border-b border-border/50 px-3 py-1.5 transition-colors last:border-b-0 hover:bg-surface-2/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-subtext">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-px">
                    <p className="truncate text-xs text-foreground">{session.task}</p>
                    <p className="text-[10px] text-subtext">
                      {session.provider} <span className="text-subtext/50">·</span> {formatTimeAgo(session.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={sessionToBadgeStatus(session)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
