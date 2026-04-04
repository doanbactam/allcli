import type { ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";
import { BaseProvider } from "./base-provider.js";

export class ClaudeProvider extends BaseProvider {
  readonly name = "claude";
  readonly supportedModels = ["opus", "sonnet", "haiku"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    const args: string[] = [];
    if (config.dangerouslySkipPermissions) {
      args.push("--dangerously-skip-permissions");
    }

    args.push("--output-format", config.outputFormat ?? "text");

    if (config.model) {
      args.push("--model", config.model);
    }

    args.push(config.prompt);

    return this.processManager.spawnProcess(config.command ?? "claude", args, config.cwd, events);
  }
}
