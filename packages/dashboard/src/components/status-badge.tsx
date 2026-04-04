import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

const toneMap: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  danger: "bg-danger/15 text-danger border-danger/20",
  neutral: "bg-muted/50 text-muted-foreground border-border",
};

function resolveTone(status: string): BadgeTone {
  const normalized = status.toLowerCase();
  if (["active", "success", "completed", "running", "done", "merged"].includes(normalized)) return "success";
  if (["idle", "pending", "in-progress", "in_progress", "spawning", "blocked"].includes(normalized)) return "warning";
  if (["error", "failed", "errored", "killed"].includes(normalized)) return "danger";
  return "neutral";
}

export function StatusBadge({ status }: { status: string }) {
  const tone = resolveTone(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        toneMap[tone]
      )}
    >
      {status.replace(/[-_]/g, " ")}
    </span>
  );
}
