import { useEffect, useMemo, useState } from "react";
import { FolderSearch, LoaderCircle } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { useWebSocket } from "@/hooks/use-websocket";
import { api, type ApiSession } from "@/lib/api-client";
import { applyRuntimeEvent, type RuntimeState } from "@/lib/runtime-ux";
import { formatTimeAgo } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { RepoRail } from "@/components/ide/repo-rail";
import { ExplorerPanel } from "@/components/ide/explorer-panel";
import { FileViewer } from "@/components/ide/file-viewer";
import { WorkPanel } from "@/components/ide/work-panel";
import { ActivityPanel } from "@/components/ide/activity-panel";
import { ControlPanel } from "@/components/ide/control-panel";

const ACTIVE_REPO_STORAGE_KEY = "allcli.activeRepoId";

export function IdeWorkbench() {
  const reposQuery = useLiveData(() => api.repos(), { refreshInterval: 5000 });
  const repos = reposQuery.state.data ?? [];
  const [activeRepoId, setActiveRepoId] = useState<string | null>(() => readStoredActiveRepoId());
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const [removingRepoId, setRemovingRepoId] = useState<string | null>(null);
  const [repoActionError, setRepoActionError] = useState<string | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    logsBySession: {},
    selectedSessionId: null
  });

  useEffect(() => {
    if (activeRepoId && repos.some((repo) => repo.id === activeRepoId)) {
      return;
    }

    const storedRepoId = readStoredActiveRepoId();
    if (storedRepoId && repos.some((repo) => repo.id === storedRepoId)) {
      setActiveRepoId(storedRepoId);
      return;
    }

    setActiveRepoId(repos[0]?.id ?? null);
  }, [activeRepoId, repos]);

  useEffect(() => {
    writeStoredActiveRepoId(activeRepoId);
  }, [activeRepoId]);

  useEffect(() => {
    setSelectedFilePath(null);
    setRuntimeState((previous) => ({
      ...previous,
      selectedSessionId: null
    }));
  }, [activeRepoId]);

  const activeRepo = useMemo(
    () => repos.find((repo) => repo.id === activeRepoId) ?? null,
    [activeRepoId, repos]
  );

  const websocket = useWebSocket({
    onEvent: (event) => {
      void reposQuery.refresh();
      setRuntimeState((previous) => applyRuntimeEvent(previous, event, { activeRepoId, limit: 400 }));
    },
  });

  const handleAddRepo = async (path: string) => {
    setAddingRepo(true);
    try {
      setRepoActionError(null);
      const repo = await api.addRepo(path);
      await reposQuery.refresh();
      setActiveRepoId(repo.id);
    } finally {
      setAddingRepo(false);
    }
  };

  const handleRemoveRepo = async (repoId: string) => {
    const nextRepoId = activeRepoId === repoId ? repos.find((repo) => repo.id !== repoId)?.id ?? null : activeRepoId;

    setRemovingRepoId(repoId);
    try {
      setRepoActionError(null);
      await api.removeRepo(repoId);
      await reposQuery.refresh();
      setActiveRepoId(nextRepoId);
    } catch (error: unknown) {
      setRepoActionError(error instanceof Error ? error.message : "Failed to remove repository.");
    } finally {
      setRemovingRepoId(null);
    }
  };

  const handleSessionCreated = (session: ApiSession) => {
    setRuntimeState((previous) => ({
      ...previous,
      selectedSessionId: session.id
    }));
  };

  const appendToComposer = (snippet: string) => {
    setComposerDraft((previous) => (previous ? `${previous}\n\n${snippet}` : snippet));
  };

  return (
    <div className="flex h-dvh min-h-0 bg-background text-foreground">
      <div className="hidden xl:block xl:w-[320px] xl:min-w-[320px]">
        <RepoRail
          repos={repos}
          activeRepoId={activeRepoId}
          connectionStatus={websocket.status}
          addingRepo={addingRepo}
          removingRepoId={removingRepoId}
          actionError={repoActionError}
          onSelectRepo={setActiveRepoId}
          onAddRepo={handleAddRepo}
          onRemoveRepo={handleRemoveRepo}
          onRefresh={() => {
            setRepoActionError(null);
            void reposQuery.refresh();
          }}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card/80 px-5 py-4">
          {activeRepo ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] uppercase text-muted-foreground">IDE Shell</span>
                  <StatusBadge status={websocket.status} />
                  <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {activeRepo.isDefault ? "Primary Workspace" : "Connected Repository"}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-balance">{activeRepo.name}</h1>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{activeRepo.rootPath}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1">
                    Added {formatTimeAgo(activeRepo.addedAt)}
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1">
                    Last opened {formatTimeAgo(activeRepo.lastOpenedAt)}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <HeaderMetric label="Provider" value={activeRepo.provider} meta={activeRepo.isDefault ? "Pinned as primary" : "Connected on demand"} />
                <HeaderMetric label="Live Sessions" value={String(activeRepo.activeSessions)} meta={`${activeRepo.totalSessions} total`} />
                <HeaderMetric label="Tasks" value={String(activeRepo.taskCount)} meta={`Added ${formatTimeAgo(activeRepo.addedAt)}`} />
                <HeaderMetric label="Errors" value={String(activeRepo.erroredSessions)} meta={`Opened ${formatTimeAgo(activeRepo.lastOpenedAt)}`} />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[96px] items-center justify-center rounded-2xl border border-border/70 bg-card/60 text-sm text-muted-foreground">
              {reposQuery.state.status === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-4" />
                  Loading repositories...
                </span>
              ) : (
                "Add a repository to start the IDE shell."
              )}
            </div>
          )}
        </header>

        <div className="border-b border-border/70 bg-card/70 p-4 xl:hidden">
          <RepoRail
            repos={repos}
            activeRepoId={activeRepoId}
            connectionStatus={websocket.status}
            addingRepo={addingRepo}
            removingRepoId={removingRepoId}
            actionError={repoActionError}
            onSelectRepo={setActiveRepoId}
            onAddRepo={handleAddRepo}
            onRemoveRepo={handleRemoveRepo}
            compact
            onRefresh={() => {
              setRepoActionError(null);
              void reposQuery.refresh();
            }}
          />
        </div>

        {activeRepo ? (
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_420px] xl:grid-rows-[minmax(0,1fr)_minmax(280px,36%)]">
              <div className="min-h-0 xl:row-span-2">
                <ExplorerPanel
                  repoId={activeRepo.id}
                  selectedPath={selectedFilePath}
                  onSelectFile={setSelectedFilePath}
                />
              </div>

              <div className="min-h-0">
                <FileViewer
                  repoId={activeRepo.id}
                  selectedPath={selectedFilePath}
                  onInsertToComposer={appendToComposer}
                />
              </div>

              <div className="min-h-0">
                <ControlPanel
                  repoId={activeRepo.id}
                  draft={composerDraft}
                  onDraftChange={setComposerDraft}
                  onSessionCreated={handleSessionCreated}
                  onRepoMutation={() => {
                    void reposQuery.refresh();
                  }}
                />
              </div>

              <div className="min-h-0">
                <WorkPanel
                  repoId={activeRepo.id}
                  onRepoMutation={() => {
                    void reposQuery.refresh();
                  }}
                />
              </div>

              <div className="min-h-0">
                <ActivityPanel
                  repoId={activeRepo.id}
                  selectedSessionId={runtimeState.selectedSessionId}
                  logsBySession={runtimeState.logsBySession}
                  connectionStatus={websocket.status}
                  onSelectSession={(sessionId) => {
                    setRuntimeState((previous) => ({
                      ...previous,
                      selectedSessionId: sessionId
                    }));
                  }}
                  onRepoMutation={() => {
                    void reposQuery.refresh();
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card px-8 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-border bg-background">
                <FolderSearch className="size-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-balance">Connect a repository to begin</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  This workspace is designed for real repo operations: browse files, queue work, run sessions,
                  and inspect output in one place.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HeaderMetric({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/45 px-3 py-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{meta}</div>
    </div>
  );
}

function readStoredActiveRepoId(): string | null {
  try {
    return globalThis.localStorage.getItem(ACTIVE_REPO_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveRepoId(repoId: string | null): void {
  try {
    if (repoId) {
      globalThis.localStorage.setItem(ACTIVE_REPO_STORAGE_KEY, repoId);
      return;
    }

    globalThis.localStorage.removeItem(ACTIVE_REPO_STORAGE_KEY);
  } catch {
    // Ignore storage failures so the workbench still functions.
  }
}
