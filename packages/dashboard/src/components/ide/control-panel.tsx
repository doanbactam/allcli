import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { CheckCircle2, LoaderCircle, Play, Rocket, ShieldCheck } from "lucide-react";
import type { ApiSession, ApiVerifySummary } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { summarizeVerifySummary } from "@/lib/runtime-ux";
import { cn } from "@/lib/utils";
import { PanelShell } from "./panel-shell";

interface ControlPanelProps {
  repoId: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onSessionCreated: (session: ApiSession) => void;
  onRepoMutation: () => void;
}

const agentRoles = ["planner", "builder", "reviewer", "tester", "general"] as const;

interface VerifyRunRecord {
  id: string;
  createdAt: string;
  summary: ApiVerifySummary;
}

export function ControlPanel({
  repoId,
  draft,
  onDraftChange,
  onSessionCreated,
  onRepoMutation,
}: ControlPanelProps) {
  const [agentRole, setAgentRole] = useState<(typeof agentRoles)[number]>("builder");
  const [agentTask, setAgentTask] = useState("");
  const [verifyRuns, setVerifyRuns] = useState<VerifyRunRecord[]>([]);
  const [busyAction, setBusyAction] = useState<"prompt" | "agent" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVerifyRuns([]);
    setError(null);
  }, [repoId]);

  const runPrompt = async () => {
    if (!repoId) {
      return;
    }
    if (!draft.trim()) {
      setError("Write a prompt before starting a session.");
      return;
    }

    try {
      setBusyAction("prompt");
      setError(null);
      const session = await api.runRepoPrompt(repoId, draft.trim());
      onSessionCreated(session);
      onRepoMutation();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Failed to run prompt.");
    } finally {
      setBusyAction(null);
    }
  };

  const runAgent = async () => {
    if (!repoId) {
      return;
    }

    try {
      setBusyAction("agent");
      setError(null);
      const session = await api.spawnRepoAgent(repoId, {
        role: agentRole,
        task: agentTask.trim() || undefined,
      });
      onSessionCreated(session);
      onRepoMutation();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Failed to spawn agent.");
    } finally {
      setBusyAction(null);
    }
  };

  const runVerify = async () => {
    if (!repoId) {
      return;
    }

    try {
      setBusyAction("verify");
      setError(null);
      const summary = await api.verifyRepo(repoId);
      setVerifyRuns((previous) => [
        {
          id: `${Date.now()}-${previous.length}`,
          createdAt: new Date().toISOString(),
          summary
        },
        ...previous
      ].slice(0, 5));
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Failed to run verification.");
    } finally {
      setBusyAction(null);
    }
  };

  const latestVerifyRun = verifyRuns[0] ?? null;

  return (
    <PanelShell
      title="Composer"
      subtitle="Send prompts, spawn role-focused agents, and run verification without leaving the workspace."
      bodyClassName="min-h-0"
    >
      <Tabs.Root defaultValue="prompt" className="flex h-full min-h-0 flex-col">
        <Tabs.List className="flex border-b border-border/70 px-3 pt-2">
          {[
            { value: "prompt", label: "Prompt" },
            { value: "agent", label: "Agent" },
            { value: "verify", label: "Verify" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="rounded-t-lg border border-b-0 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {error ? <div className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-xs text-danger">{error}</div> : null}

        <Tabs.Content value="prompt" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 outline-none">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Describe the change you want the selected repository to execute."
            className="min-h-[200px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-primary/40"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Use the file preview to inject code context directly into this prompt.
            </p>
            <button
              type="button"
              onClick={() => {
                void runPrompt();
              }}
              disabled={busyAction !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "prompt" ? <LoaderCircle className="size-4" /> : <Play className="size-4" />}
              Run Prompt
            </button>
          </div>
        </Tabs.Content>

        <Tabs.Content value="agent" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 outline-none">
          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Role</span>
              <select
                value={agentRole}
                onChange={(event) => setAgentRole(event.target.value as (typeof agentRoles)[number])}
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none transition-colors focus:border-primary/40"
              >
                {agentRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Task</span>
              <textarea
                value={agentTask}
                onChange={(event) => setAgentTask(event.target.value)}
                placeholder="Optional instruction for the agent role."
                className="min-h-[160px] resize-none rounded-lg border border-border bg-background px-3 py-3 outline-none transition-colors focus:border-primary/40"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void runAgent();
              }}
              disabled={busyAction !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "agent" ? <LoaderCircle className="size-4" /> : <Rocket className="size-4" />}
              Spawn Agent
            </button>
          </div>
        </Tabs.Content>

        <Tabs.Content value="verify" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 outline-none">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-4">
            <div>
              <p className="text-sm font-semibold">Run repo quality gates</p>
              <p className="mt-1 text-xs text-muted-foreground">Typecheck, lint, test, and build for the active workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void runVerify();
              }}
              disabled={busyAction !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "verify" ? <LoaderCircle className="size-4" /> : <ShieldCheck className="size-4" />}
              Run Verify
            </button>
          </div>

          {latestVerifyRun ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Latest Verify Run</p>
                  <p className="text-xs text-muted-foreground">{latestVerifyRun.summary.totalDuration}ms total</p>
                </div>
                <span
                  className={cn(
                    "rounded-lg border px-2 py-1 text-xs font-semibold",
                    latestVerifyRun.summary.allPassed
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-danger/30 bg-danger/10 text-danger"
                  )}
                >
                  {summarizeVerifySummary(latestVerifyRun.summary).label}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {latestVerifyRun.summary.results.map((result) => (
                  <div key={result.gate} className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{result.gate}</span>
                      <span className="font-mono text-xs text-muted-foreground">{result.duration}ms</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className={cn("size-3.5", result.passed ? "text-success" : "text-danger")} />
                      <span>{result.passed ? "Passed" : result.output ?? "Failed"}</span>
                    </div>
                    {!result.passed && result.output ? (
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-background/80 px-2 py-2 font-mono text-[11px] leading-5 text-muted-foreground">
                        {result.output}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>

              {verifyRuns.length > 1 ? (
                <div className="flex flex-col gap-2 border-t border-border/70 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Runs</p>
                  {verifyRuns.slice(1).map((run) => {
                    const summary = summarizeVerifySummary(run.summary);
                    return (
                      <div key={run.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{summary.label}</p>
                          <p className="text-xs text-muted-foreground">{summary.details}</p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{run.summary.totalDuration}ms</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </Tabs.Content>
      </Tabs.Root>
    </PanelShell>
  );
}
