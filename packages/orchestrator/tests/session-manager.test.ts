import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProviderHandle, SpawnConfig, SpawnEvents } from "@allcli/core";
import { BaseProvider } from "@allcli/providers";
import { SessionManager } from "../src/session-manager.js";
import { SessionStore } from "../src/session-store.js";

class SuccessProvider extends BaseProvider {
  readonly name = "claude";
  readonly supportedModels = ["fixture"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    return this.processManager.spawnProcess(
      process.execPath,
      ["-e", `console.log(${JSON.stringify(config.prompt)});setTimeout(() => process.exit(0),20);`],
      config.cwd,
      events
    );
  }
}

class LongProvider extends BaseProvider {
  readonly name = "claude";
  readonly supportedModels = ["fixture"] as const;

  async spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle> {
    return this.processManager.spawnProcess(process.execPath, ["-e", "setInterval(() => {}, 1000);"], config.cwd, events);
  }
}

describe("SessionManager", () => {
  it("records run lifecycle from spawning to done", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-sm-"));
    const store = new SessionStore(join(root, "sessions.json"));
    const manager = new SessionManager(new SuccessProvider(), store);

    const session = await manager.run("hello", {
      cwd: root,
      dangerous: false,
      outputFormat: "text"
    });

    expect(session.status).toBe("working");
    let status = manager.getById(session.id)?.status;
    const deadline = Date.now() + 900;
    while (status !== "done" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      status = manager.getById(session.id)?.status;
    }

    expect(status).toBe("done");

    rmSync(root, { recursive: true, force: true });
  });

  it("can kill a running session", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-sm-kill-"));
    const store = new SessionStore(join(root, "sessions.json"));
    const manager = new SessionManager(new LongProvider(), store);

    const session = await manager.run("long", {
      cwd: root,
      dangerous: false,
      outputFormat: "text"
    });

    await manager.kill(session.id);
    const killed = manager.getById(session.id);
    expect(killed?.status).toBe("killed");

    rmSync(root, { recursive: true, force: true });
  });
});
