import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

const toneMap: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface-2 text-subtext",
};

const dotColor: Record<BadgeTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtext",
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
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
        toneMap[tone],
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotColor[tone])} />
      {status.replace(/[-_]/g, " ")}
    </span>
  );
}
