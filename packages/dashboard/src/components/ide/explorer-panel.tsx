import { useCallback, useEffect, useMemo, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { ChevronDown, ChevronRight, FileCode2, FolderTree, LoaderCircle } from "lucide-react";
import { api, type ApiFileEntry } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";
import { PanelShell } from "./panel-shell";

interface ExplorerPanelProps {
  repoId: string | null;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

type DirectoryMap = Record<string, ApiFileEntry[]>;

export function ExplorerPanel({ repoId, selectedPath, onSelectFile }: ExplorerPanelProps) {
  const [directories, setDirectories] = useState<DirectoryMap>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(
    async (path: string) => {
      if (!repoId) {
        return;
      }

      setLoadingPaths((previous) => new Set(previous).add(path));
      try {
        const snapshot = await api.repoFiles(repoId, path);
        setDirectories((previous) => ({
          ...previous,
          [path]: snapshot.entries,
        }));
        setError(null);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load directory.");
      } finally {
        setLoadingPaths((previous) => {
          const next = new Set(previous);
          next.delete(path);
          return next;
        });
      }
    },
    [repoId]
  );

  useEffect(() => {
    setDirectories({});
    setExpandedPaths(new Set([""]));
    setError(null);
    if (!repoId) {
      return;
    }

    void loadDirectory("");
  }, [loadDirectory, repoId]);

  const toggleDirectory = useCallback(
    async (path: string) => {
      setExpandedPaths((previous) => {
        const next = new Set(previous);
        if (next.has(path)) {
          next.delete(path);
          return next;
        }

        next.add(path);
        return next;
      });

      if (!directories[path]) {
        await loadDirectory(path);
      }
    },
    [directories, loadDirectory]
  );

  const rootEntries = useMemo(() => directories[""] ?? [], [directories]);

  const renderEntries = (entries: ApiFileEntry[], depth: number): React.JSX.Element[] => {
    return entries.flatMap((entry) => {
      const isDirectory = entry.type === "directory";
      const isExpanded = expandedPaths.has(entry.path);
      const isLoading = loadingPaths.has(entry.path);

      const item = (
        <div key={entry.path} className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              if (isDirectory) {
                void toggleDirectory(entry.path);
                return;
              }

              onSelectFile(entry.path);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
              selectedPath === entry.path
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-background/70",
              depth > 0 && "ml-3"
            )}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isDirectory ? (
              isExpanded ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="size-3.5 shrink-0" />
            )}

            {isDirectory ? (
              <FolderTree className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
            )}

            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            {!isDirectory ? (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                {entry.size > 0 ? formatNumber(entry.size) : "--"}
              </span>
            ) : null}
            {isLoading ? <LoaderCircle className="size-3.5 text-muted-foreground" /> : null}
          </button>
        </div>
      );

      if (!isDirectory || !isExpanded) {
        return [item];
      }

      return [item, ...renderEntries(directories[entry.path] ?? [], depth + 1)];
    });
  };

  return (
    <PanelShell
      title="Explorer"
      subtitle="Read-only tree for the active repository."
      bodyClassName="min-h-0"
    >
      <ScrollArea.Root className="h-full">
        <ScrollArea.Viewport className="h-full px-3 py-3">
          {!repoId ? <EmptyState message="Select a repository to browse files." /> : null}
          {repoId && rootEntries.length === 0 && loadingPaths.has("") ? (
            <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="size-4" />
              Loading files...
            </div>
          ) : null}
          {repoId && error ? <EmptyState message={error} tone="danger" /> : null}
          {repoId && !error && rootEntries.length > 0 ? (
            <div className="flex flex-col gap-0.5">{renderEntries(rootEntries, 0)}</div>
          ) : null}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
          <ScrollArea.Thumb className="rounded-full bg-border" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </PanelShell>
  );
}

function EmptyState({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "danger" }) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] items-center justify-center rounded-xl border px-4 text-center text-sm",
        tone === "danger"
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-border/70 bg-background/40 text-muted-foreground"
      )}
    >
      {message}
    </div>
  );
}
