import { useState } from "react";
import { FolderGit2, LoaderCircle, Plus, RefreshCw, Signal, Trash2 } from "lucide-react";
import type { ApiRepoSummary } from "@/lib/api-client";
import { cn, formatTimeAgo } from "@/lib/utils";

interface RepoRailProps {
  repos: ApiRepoSummary[];
  activeRepoId: string | null;
  connectionStatus: "connecting" | "connected" | "disconnected";
  addingRepo: boolean;
  removingRepoId: string | null;
  actionError: string | null;
  compact?: boolean;
  onSelectRepo: (repoId: string) => void;
  onAddRepo: (path: string) => Promise<void>;
  onRemoveRepo: (repoId: string) => Promise<void>;
  onRefresh: () => void;
}

export function RepoRail({
  repos,
  activeRepoId,
  connectionStatus,
  addingRepo,
  removingRepoId,
  actionError,
  compact = false,
  onSelectRepo,
  onAddRepo,
  onRemoveRepo,
  onRefresh,
}: RepoRailProps) {
  const [repoPath, setRepoPath] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddRepo = async () => {
    if (!repoPath.trim()) {
      setSubmitError("Enter a local repository path.");
      return;
    }

    try {
      setSubmitError(null);
      await onAddRepo(repoPath.trim());
      setRepoPath("");
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "Failed to add repository.");
    }
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col bg-sidebar text-sidebar-foreground",
        compact ? "rounded-2xl border border-border" : "h-dvh border-r border-border"
      )}
    >
      <div className="border-b border-border/80 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-background/70">
              <FolderGit2 className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">AllCLI</span>
              <span className="text-sm font-semibold">Repo Control</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border bg-background/60 p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Refresh repositories"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <Signal className="size-3.5" />
          <span className="font-medium capitalize">{connectionStatus}</span>
          <span className="text-muted-foreground/70">WebSocket</span>
        </div>
        {actionError ? <p className="mt-3 text-xs text-danger">{actionError}</p> : null}
      </div>

      <div className={cn("min-h-0 overflow-y-auto px-3 py-3", compact ? "max-h-[320px]" : "flex-1")}>
        <div className="flex flex-col gap-2">
          {repos.map((repo) => {
            const isActive = repo.id === activeRepoId;
            return (
              <article
                key={repo.id}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                  isActive
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/70 bg-background/35 text-sidebar-foreground hover:bg-background/55"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectRepo(repo.id)}
                    className="flex min-w-0 flex-1 flex-col gap-2 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{repo.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{repo.provider}</p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{repo.rootPath}</p>
                      </div>
                      <span className="rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {repo.activeSessions} live
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {repo.isDefault ? (
                        <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 font-semibold">
                          Primary
                        </span>
                      ) : null}
                      <span>Added {formatTimeAgo(repo.addedAt)}</span>
                      <span>Opened {formatTimeAgo(repo.lastOpenedAt)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div className="rounded-lg border border-border/60 bg-background/45 px-2 py-1">
                        <div className="font-mono text-[10px] uppercase">Sessions</div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{repo.totalSessions}</div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/45 px-2 py-1">
                        <div className="font-mono text-[10px] uppercase">Tasks</div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{repo.taskCount}</div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/45 px-2 py-1">
                        <div className="font-mono text-[10px] uppercase">Errors</div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{repo.erroredSessions}</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!repo.isDefault && globalThis.confirm(`Remove ${repo.name} from the IDE shell?`)) {
                        void onRemoveRepo(repo.id);
                      }
                    }}
                    disabled={repo.isDefault || removingRepoId === repo.id}
                    className="rounded-lg border border-border/70 bg-background/60 p-2 text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={repo.isDefault ? "Primary repository cannot be removed" : `Remove ${repo.name}`}
                    title={repo.isDefault ? "Primary repository cannot be removed" : `Remove ${repo.name}`}
                  >
                    {removingRepoId === repo.id ? <LoaderCircle className="size-4" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/80 px-3 py-3">
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
          <label htmlFor="repo-path" className="text-xs font-medium text-muted-foreground">
            Add repository
          </label>
          <input
            id="repo-path"
            value={repoPath}
            onChange={(event) => setRepoPath(event.target.value)}
            placeholder="C:\\code\\my-repo"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
          />
          {submitError ? <p className="text-xs text-danger">{submitError}</p> : null}
          <button
            type="button"
            onClick={() => {
              void handleAddRepo();
            }}
            disabled={addingRepo}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingRepo ? <LoaderCircle className="size-4" /> : <Plus className="size-4" />}
            Add Repo
          </button>
        </div>
      </div>
    </aside>
  );
}
