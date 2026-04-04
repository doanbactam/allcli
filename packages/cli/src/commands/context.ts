import { resolve } from "node:path";
import { loadConfig, resolveProviderName } from "@allcli/core";
import type { AllCliConfig, ProviderName } from "@allcli/core";
import { SessionManager, SessionStore } from "@allcli/orchestrator";
import { ClaudeProvider, CodexProvider, OpenCodeProvider } from "@allcli/providers";
import { WorktreeManager, TaskTracker, Inbox } from "@allcli/workspace";
import type { Provider } from "@allcli/core";

export interface CliContext {
  manager: SessionManager;
  config: AllCliConfig;
  cwd: string;
  provider: Provider;
  providerName: ProviderName;
  worktreeManager: WorktreeManager;
  taskTracker: TaskTracker;
  inbox: Inbox;
}

function createProvider(name: ProviderName): Provider {
  switch (name) {
    case "opencode":
      return new OpenCodeProvider();
    case "codex":
      return new CodexProvider();
    case "claude":
    default:
      return new ClaudeProvider();
  }
}

export function createCliContext(cwd: string = process.cwd(), providerOverride?: string): CliContext {
  const config = loadConfig(cwd);
  const providerName = resolveProviderName(config, providerOverride);
  const store = new SessionStore(resolve(cwd, config.orchestrator.statePath));
  const provider = createProvider(providerName);
  const manager = new SessionManager(provider, store);
  const worktreeManager = new WorktreeManager(cwd);
  const taskTracker = new TaskTracker(cwd);
  const inbox = new Inbox(cwd);

  return { manager, config, cwd, provider, providerName, worktreeManager, taskTracker, inbox };
}
