type TrendDirection = "up" | "down" | "neutral";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { direction: TrendDirection; value: string };
};

export function SummaryCard({ title, value, subtitle, icon }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
          <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="shrink-0 text-muted-foreground">{icon}</div>
        ) : null}
      </div>
    </article>
  );
}

export function SummaryCardSkeleton() {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="size-8 animate-pulse rounded bg-muted" />
      </div>
    </article>
  );
}
