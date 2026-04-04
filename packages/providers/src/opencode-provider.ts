import type { ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";
import { BaseProvider } from "./base-provider.js";

export class OpenCodeProvider extends BaseProvider {
  readonly name = "opencode";
  readonly supportedModels = ["anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "openai/gpt-5", "openai/gpt-5-mini"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    const args: string[] = ["run"];

    if (config.outputFormat === "stream-json") {
      args.push("--format", "json");
    }

    if (config.model) {
      args.push("--model", config.model);
    }

    args.push(config.prompt);

    return this.processManager.spawnProcess(config.command ?? "opencode", args, config.cwd, events);
  }
}
