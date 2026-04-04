import { describe, expect, it } from "vitest";
import { BaseProvider } from "../src/base-provider.js";
import type { ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";

class NodeFixtureProvider extends BaseProvider {
  readonly name = "node-fixture";
  readonly supportedModels = ["fixture"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    return this.processManager.spawnProcess(
      process.execPath,
      ["-e", `console.log(${JSON.stringify(config.prompt)});setTimeout(()=>process.exit(0),50);`],
      config.cwd,
      events
    );
  }
}

class LongRunningProvider extends BaseProvider {
  readonly name = "node-long";
  readonly supportedModels = ["fixture"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    return this.processManager.spawnProcess(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000);"],
      config.cwd,
      events
    );
  }
}

describe("provider process lifecycle", () => {
  it("captures stdout output and exits cleanly", async () => {
    const provider = new NodeFixtureProvider();

    let outputResolve!: (value: string) => void;
    const outputPromise = new Promise<string>((resolve) => { outputResolve = resolve; });

    const handle = await provider.spawn({
      prompt: "hello from provider",
      cwd: process.cwd()
    }, {
      onStdout: (text) => { outputResolve(text); }
    });

    const output = await outputPromise;
    expect(output).toContain("hello from provider");

    // Wait for process to exit (event-driven polling)
    const deadline = Date.now() + 2000;
    while (await provider.isAlive(handle) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(await provider.isAlive(handle)).toBe(false);
  });

  it("can destroy an active process", async () => {
    const provider = new LongRunningProvider();
    const handle = await provider.spawn({
      prompt: "unused",
      cwd: process.cwd()
    });

    expect(await provider.isAlive(handle)).toBe(true);
    await provider.destroy(handle);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(await provider.isAlive(handle)).toBe(false);
  });
});
