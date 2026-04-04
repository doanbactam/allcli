import type { ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";
import { BaseProvider } from "./base-provider.js";

export class CodexProvider extends BaseProvider {
  readonly name = "codex";
  readonly supportedModels = ["gpt-5-codex", "o3", "o4-mini"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    const args: string[] = ["exec"];

    if (config.dangerouslySkipPermissions) {
      args.push("--full-auto");
    } else {
      args.push("--ask-for-approval", "never", "--sandbox", "workspace-write");
    }

    if (config.model) {
      args.push("-m", config.model);
    }

    args.push(config.prompt);

    return this.processManager.spawnProcess(config.command ?? "codex", args, config.cwd, events);
  }
}
