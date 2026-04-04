import { Card, CardHeader, CardContent } from "@/components/ui/card";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export function SummaryCard({ title, value, subtitle, icon }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{title}</span>
            <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </span>
          </div>
        </div>
      </CardHeader>
      {subtitle ? (
        <CardContent>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="size-9 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
