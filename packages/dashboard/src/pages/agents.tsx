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
      (s) => s.status === "working" || s.status === "spawning",
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

function AgentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/50 px-3 py-2">
      <div className="size-6 animate-pulse rounded bg-surface-2" />
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        <div className="h-2.5 w-40 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-surface-2" />
      <div className="h-4 w-8 animate-pulse rounded bg-surface-2" />
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
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Filter tabs — IDE segmented control style */}
      <div className="flex items-center gap-px border border-border bg-surface-1">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-3 py-1 text-[11px] font-medium transition-colors",
              activeFilter === filter
                ? "bg-surface-2 text-foreground"
                : "text-subtext hover:text-foreground",
            )}
          >
            {filter === "All" ? "All" : (providerLabels[filter] ?? filter)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <section className="border border-border bg-surface-1">
          <AgentRowSkeleton />
          <AgentRowSkeleton />
          <AgentRowSkeleton />
        </section>
      )}

      {/* Error */}
      {hasError && (
        <div className="flex items-center gap-2 border border-danger/30 bg-danger/5 px-3 py-3 text-xs text-danger">
          <span className="size-1.5 rounded-full bg-danger" />
          Failed to load agents: {errorMessage}. Retrying...
        </div>
      )}

      {/* Empty */}
      {!isLoading && !hasError && filteredAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 border border-border bg-surface-1 py-8">
          <Bot className="size-4 text-subtext" />
          <div className="flex flex-col gap-0.5 text-center">
            <p className="text-xs text-foreground">No agents found</p>
            <p className="text-[10px] text-subtext">
              {activeFilter === "All"
                ? "Start a session to see agent activity."
                : `No ${providerLabels[activeFilter] ?? activeFilter} agents active.`}
            </p>
          </div>
        </div>
      )}

      {/* Agent list — table/list view like IDE terminal */}
      {!isLoading && !hasError && filteredAgents.length > 0 && (
        <section className="border border-border bg-surface-1">
          {/* Table header */}
          <div className="flex items-center gap-3 border-b border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtext">
            <span className="w-6" />
            <span className="flex-1">Provider</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-16 text-right tabular-nums">Active</span>
            <span className="w-16 text-right tabular-nums">Total</span>
          </div>

          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="group flex items-center gap-3 border-b border-border/50 px-3 py-2 transition-colors last:border-b-0 hover:bg-surface-2/50"
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded",
                  agent.status === "working"
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-2 text-subtext",
                )}
              >
                <Cpu className="size-3.5" />
              </div>

              {/* Name + description */}
              <div className="flex flex-1 flex-col gap-px min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{agent.name}</p>
                <p className="truncate text-[10px] text-subtext">{agent.description}</p>
              </div>

              {/* Status */}
              <div className="w-20 flex justify-center">
                <StatusBadge status={agent.status} />
              </div>

              {/* Active tasks */}
              <div className="flex w-16 items-center justify-end gap-1 tabular-nums">
                {agent.activeTasks > 0 && <Zap className="size-2.5 text-warning" />}
                <span className="text-xs font-medium">{agent.activeTasks}</span>
              </div>

              {/* Total sessions */}
              <div className="w-16 text-right text-xs tabular-nums text-subtext">
                {agent.totalSessions}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
