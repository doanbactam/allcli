import { useCallback, useMemo, useState } from "react";
import { Bot, Cpu, Zap } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { api, type ApiSession } from "@/lib/api-client";
import { useApiData } from "@/hooks/use-api-data";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

type ProviderFilter = "All" | "claude" | "opencode" | "codex";

const filters: ProviderFilter[] = ["All", "claude", "opencode", "codex"];

const providerLabels: Record<string, string> = {
  claude: "Claude",
  opencode: "OpenCode",
  codex: "Codex",
};

const providerDescriptions: Record<string, string> = {
  claude: "General-purpose reasoning and code generation",
  opencode: "Specialized code generation and refactoring",
  codex: "Automated patch building and testing",
};

interface AgentCard {
  id: string;
  name: string;
  provider: string;
  providerLabel: string;
  description: string;
  status: string;
  activeTasks: number;
  totalSessions: number;
}

function deriveAgents(sessions: ApiSession[]): AgentCard[] {
  const byProvider = new Map<string, ApiSession[]>();

  for (const session of sessions) {
    const provider = session.provider;
    const existing = byProvider.get(provider) ?? [];
    existing.push(session);
    byProvider.set(provider, existing);
  }

  if (byProvider.size === 0) return [];

  const agents: AgentCard[] = [];

  for (const [provider, providerSessions] of byProvider) {
    const activeCount = providerSessions.filter(
      (s) => s.status === "working" || s.status === "spawning"
    ).length;
    const hasErrors = providerSessions.some((s) => s.status === "errored");

    let status = "idle";
    if (activeCount > 0) {
      status = "working";
    } else if (hasErrors) {
      status = "error";
    }

    agents.push({
      id: provider,
      name: providerLabels[provider] ?? provider,
      provider,
      providerLabel: providerLabels[provider] ?? provider,
      description: providerDescriptions[provider] ?? "AI agent",
      status,
      activeTasks: activeCount,
      totalSessions: providerSessions.length,
    });
  }

  return agents;
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

export function AgentsPage() {
  const [activeFilter, setActiveFilter] = useState<ProviderFilter>("All");
  const fetchSessions = useCallback(() => api.sessions(), []);
  const { state, refresh } = useApiData(fetchSessions, { refreshInterval: 5_000 });

  useWebSocket({
    onEvent: (event) => {
      if (event.type === "session.transition" || event.type === "session.updated") {
        refresh();
      }
    },
  });

  const sessions = state.status === "success" ? state.data : [];
  const agents = useMemo(() => deriveAgents(sessions), [sessions]);

  const filteredAgents = useMemo(() => {
    if (activeFilter === "All") return agents;
    return agents.filter((agent) => agent.provider === activeFilter);
  }, [agents, activeFilter]);

  const isLoading = state.status === "loading";
  const hasError = state.status === "error";
  const errorMessage = state.status === "error" ? state.error : null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-balance">Agents</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Track AI worker health and provider distribution across your orchestration system.
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              activeFilter === filter
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground"
            )}
          >
            {filter === "All" ? "All Providers" : (providerLabels[filter] ?? filter)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </section>
      )}

      {/* Error State */}
      {hasError && (
        <div className="flex items-center justify-center rounded-xl border border-danger/30 bg-danger/5 py-12 text-sm text-danger">
          Failed to load agents: {errorMessage}. Retrying...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasError && filteredAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/40 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <Bot className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No agents found</p>
            <p className="text-xs text-muted-foreground">
              {activeFilter === "All"
                ? "Start a session to see agent activity."
                : `No ${providerLabels[activeFilter] ?? activeFilter} agents active.`}
            </p>
          </div>
        </div>
      )}

      {/* Agent Cards Grid */}
      {!isLoading && !hasError && filteredAgents.length > 0 && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <article
              key={agent.id}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80"
            >
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border",
                        agent.status === "working"
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-muted/50"
                      )}
                    >
                      <Cpu
                        className={cn(
                          "size-5",
                          agent.status === "working" ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-base font-semibold">{agent.name}</h2>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 rounded-lg bg-background/40 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Active Tasks
                    </span>
                    <span className="flex items-center gap-1.5 text-lg font-bold tabular-nums">
                      {agent.activeTasks > 0 && <Zap className="size-3 text-primary" />}
                      {agent.activeTasks}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg bg-background/40 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total Sessions
                    </span>
                    <span className="text-lg font-bold tabular-nums">{agent.totalSessions}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
