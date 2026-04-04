import type { ActivityState, Provider, ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";
import { ProcessManager } from "./process-manager.js";

export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  abstract readonly supportedModels: readonly string[];

  protected readonly processManager = new ProcessManager();

  abstract spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle>;

  async sendMessage(handle: ProviderHandle, message: string): Promise<void> {
    await this.processManager.write(handle, message);
  }

  async getOutput(handle: ProviderHandle, lines?: number): Promise<string> {
    return this.processManager.getOutput(handle, lines);
  }

  async isAlive(handle: ProviderHandle): Promise<boolean> {
    return this.processManager.isAlive(handle);
  }

  async getActivityState(handle: ProviderHandle): Promise<ActivityState | null> {
    return this.processManager.getActivityState(handle);
  }

  async destroy(handle: ProviderHandle): Promise<void> {
    await this.processManager.destroy(handle);
  }
}
