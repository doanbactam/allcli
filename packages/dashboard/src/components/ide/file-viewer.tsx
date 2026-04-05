import * as ScrollArea from "@radix-ui/react-scroll-area";
import { FileText, LoaderCircle } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { api } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";
import { PanelShell } from "./panel-shell";

interface FileViewerProps {
  repoId: string | null;
  selectedPath: string | null;
  onInsertToComposer: (snippet: string) => void;
}

export function FileViewer({ repoId, selectedPath, onInsertToComposer }: FileViewerProps) {
  const { state } = useLiveData(
    () => api.repoFile(repoId as string, selectedPath as string),
    {
      enabled: Boolean(repoId && selectedPath),
      refreshInterval: 0,
    }
  );
  const preview = state.data;

  const copyToClipboard = async () => {
    if (!preview?.content) {
      return;
    }

    await navigator.clipboard.writeText(preview.content);
  };

  return (
    <PanelShell
      title={selectedPath ? selectedPath : "File Preview"}
      subtitle="Open a text file from the explorer to inspect code and feed it into the composer."
      actions={
        selectedPath && preview && !preview.isBinary ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void copyToClipboard();
              }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertToComposer(buildSnippet(preview.path, preview.content, preview.truncated));
              }}
              className="rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Insert Into Composer
            </button>
          </div>
        ) : null
      }
      bodyClassName="min-h-0"
    >
      {!selectedPath ? (
        <FileEmptyState message="Choose a file to preview its contents here." />
      ) : state.status === "loading" && state.data === null ? (
        <FileEmptyState message="Loading file contents..." loading />
      ) : state.error && state.data === null ? (
        <FileEmptyState message={state.error} danger />
      ) : preview ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono">
              {formatNumber(preview.size)} bytes
            </span>
            {preview.truncated ? (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning">
                Preview truncated
              </span>
            ) : null}
            {preview.isBinary ? (
              <span className="rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 text-danger">
                Binary file
              </span>
            ) : null}
          </div>

          {preview.isBinary ? (
            <FileEmptyState message="This file looks binary, so preview is disabled in the IDE shell." />
          ) : (
            <ScrollArea.Root className="min-h-0 flex-1">
              <ScrollArea.Viewport className="h-full px-4 py-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-foreground">
                  {preview.content}
                </pre>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
                <ScrollArea.Thumb className="rounded-full bg-border" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          )}
        </div>
      ) : null}
    </PanelShell>
  );
}

function FileEmptyState({
  message,
  loading = false,
  danger = false,
}: {
  message: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center",
        danger ? "text-danger" : "text-muted-foreground"
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-background/60">
        {loading ? <LoaderCircle className="size-5" /> : <FileText className="size-5" />}
      </div>
      <p className="max-w-md text-sm text-pretty">{message}</p>
    </div>
  );
}

function buildSnippet(path: string, content: string, truncated: boolean): string {
  const suffix = truncated ? "\n[Preview truncated before insertion]" : "";
  return [`File: ${path}`, "```", content, "```", suffix].filter(Boolean).join("\n");
}
