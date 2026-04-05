import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelShell({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: PanelShellProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-balance">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground text-pretty">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
