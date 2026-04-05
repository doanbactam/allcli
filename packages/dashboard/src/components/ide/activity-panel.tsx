import { useEffect, useMemo } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { LoaderCircle, ShieldOff, TerminalSquare } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { api } from "@/lib/api-client";
import { sortSessionsForDisplay } from "@/lib/runtime-ux";
import { StatusBadge } from "@/components/status-badge";
import { formatTimeAgo } from "@/lib/utils";
import { PanelShell } from "./panel-shell";

interface ActivityPanelProps {
  repoId: string | null;
  selectedSessionId: string | null;
  logsBySession: Record<string, string[]>;
  connectionStatus: "connecting" | "connected" | "disconnected";
  onSelectSession: (sessionId: string) => void;
  onRepoMutation: () => void;
}

export function ActivityPanel({
  repoId,
  selectedSessionId,
  logsBySession,
  connectionStatus,
  onSelectSession,
  onRepoMutation,
}: ActivityPanelProps) {
  const sessionsQuery = useLiveData(() => api.repoSessions(repoId as string), {
    enabled: Boolean(repoId),
    refreshInterval: 3000,
  });

  const sessions = useMemo(() => sortSessionsForDisplay(sessionsQuery.state.data ?? []), [sessionsQuery.state.data]);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const logKey = repoId && selectedSession ? `${repoId}:${selectedSession.id}` : null;
  const logs = logKey ? logsBySession[logKey] ?? [] : [];

  useEffect(() => {
    if (selectedSession?.id && selectedSession?.id !== selectedSessionId) {
      onSelectSession(selectedSession.id);
      return;
    }

    if (!selectedSessionId && sessions[0]) {
      onSelectSession(sessions[0].id);
    }
  }, [onSelectSession, selectedSession, selectedSessionId, sessions]);

  const killSession = async (sessionId: string) => {
    if (!repoId) {
      return;
    }

    await api.killRepoSession(repoId, sessionId);
    await sessionsQuery.refresh();
    onRepoMutation();
  };

  return (
    <PanelShell
      title="Runtime"
      subtitle={`Session stream for the active repository. ${connectionStatus} websocket.`}
      bodyClassName="min-h-0"
    >
      <div className="grid h-full min-h-0 gap-0 border-t border-transparent xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="min-h-0 border-b border-border/70 xl:border-b-0 xl:border-r">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full px-3 py-3">
              <div className="flex flex-col gap-2">
                {sessionsQuery.state.status === "loading" && sessions.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4" />
                    Loading sessions...
                  </div>
                ) : null}

                {sessions.map((session) => (
                  <article
                    key={session.id}
                    className={
                      session.id === selectedSession?.id
                        ? "rounded-xl border border-primary/50 bg-primary/10 px-3 py-3"
                        : "rounded-xl border border-border/70 bg-background/45 px-3 py-3"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      className="flex w-full flex-col gap-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold">{session.task}</p>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{session.provider}</p>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{formatTimeAgo(session.updatedAt)}</span>
                        <span className="font-mono">{session.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{(logsBySession[`${repoId}:${session.id}`] ?? []).length} buffered lines</span>
                        {session.exitCode !== undefined ? <span>exit {session.exitCode}</span> : null}
                      </div>
                    </button>

                    {(session.status === "working" || session.status === "spawning" || session.status === "needs_input" || session.status === "stuck") ? (
                      <button
                        type="button"
                        onClick={() => {
                          void killSession(session.id);
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <ShieldOff className="size-3.5" />
                        Kill Session
                      </button>
                    ) : null}
                  </article>
                ))}

                {repoId && sessions.length === 0 && sessionsQuery.state.status !== "loading" ? (
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/40 px-4 text-center text-sm text-muted-foreground">
                    <div className="flex size-11 items-center justify-center rounded-full border border-border bg-card">
                      <TerminalSquare className="size-5" />
                    </div>
                    <p className="text-pretty">No sessions have been recorded for this repository yet.</p>
                  </div>
                ) : null}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
              <ScrollArea.Thumb className="rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>

        <div className="min-h-0">
          {selectedSession ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">{selectedSession.id}</span>
                  <StatusBadge status={selectedSession.status} />
                  <span className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {logs.length} lines buffered
                  </span>
                </div>
                <p className="mt-2 text-sm text-pretty">{selectedSession.task}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Created {formatTimeAgo(selectedSession.createdAt)}</span>
                  <span>Updated {formatTimeAgo(selectedSession.updatedAt)}</span>
                  {selectedSession.exitCode !== undefined ? <span>Exit {selectedSession.exitCode}</span> : null}
                </div>
              </div>

              <ScrollArea.Root className="min-h-0 flex-1">
                <ScrollArea.Viewport className="h-full px-4 py-4">
                  {logs.length > 0 ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-foreground">
                      {logs.join("\n")}
                    </pre>
                  ) : (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                      <div className="flex size-11 items-center justify-center rounded-full border border-border bg-card">
                        <TerminalSquare className="size-5" />
                      </div>
                      <p className="max-w-md text-pretty">
                        Live output appears here for sessions started while this IDE is connected.
                      </p>
                      {selectedSession.error ? <p className="text-danger">{selectedSession.error}</p> : null}
                    </div>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
                  <ScrollArea.Thumb className="rounded-full bg-border" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <div className="flex size-11 items-center justify-center rounded-full border border-border bg-card">
                <TerminalSquare className="size-5" />
              </div>
              <p>Select a session to inspect logs and runtime state.</p>
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
