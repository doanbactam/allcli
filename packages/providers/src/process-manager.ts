import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { extname } from "node:path";
import type { ActivityState, ProviderHandle, SpawnEvents } from "@allcli/core";

interface ManagedProcess {
  handle: ProviderHandle;
  child: ChildProcessWithoutNullStreams;
  stdoutChunks: string[];
  stderrChunks: string[];
  activityState: ActivityState;
}

export class ProcessManager {
  private readonly processes = new Map<string, ManagedProcess>();

  private normalizeCommand(command: string): string {
    if (process.platform !== "win32") {
      return command;
    }

    if (command.includes("\\") || command.includes("/") || extname(command).length > 0) {
      return command;
    }

    return `${command}.cmd`;
  }

  async spawnProcess(
    command: string,
    args: readonly string[],
    cwd: string,
    events?: SpawnEvents
  ): Promise<ProviderHandle> {
    return new Promise<ProviderHandle>((resolve, reject) => {
      const executable = this.normalizeCommand(command);
      const isCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);

      let child: ChildProcessWithoutNullStreams;
      if (isCmd) {
        const comspec = process.env.ComSpec ?? "cmd.exe";
        child = spawn(comspec, ["/d", "/s", "/c", executable, ...args], {
          cwd,
          stdio: "pipe",
          shell: false,
          windowsVerbatimArguments: true,
        }) as ChildProcessWithoutNullStreams;
      } else {
        child = spawn(executable, args, {
          cwd,
          stdio: "pipe",
          shell: false,
        }) as ChildProcessWithoutNullStreams;
      }

      const handle: ProviderHandle = {
        id: randomUUID(),
        pid: child.pid ?? -1,
        command: executable,
        cwd,
        startedAt: new Date()
      };

      const activityState: ActivityState = {
        status: "idle",
        lastActivityAt: new Date(),
        toolCallsCount: 0
      };

      const managed: ManagedProcess = {
        handle,
        child,
        stdoutChunks: [],
        stderrChunks: [],
        activityState
      };

      let settled = false;

      child.once("spawn", () => {
        this.processes.set(handle.id, managed);
        settled = true;
        resolve(handle);
      });

      child.once("error", (error: Error) => {
        managed.activityState.status = "waiting_input";
        events?.onError?.(error);
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        managed.stdoutChunks.push(text);
        managed.activityState.status = "working";
        managed.activityState.lastActivityAt = new Date();
        events?.onStdout?.(text);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        managed.stderrChunks.push(text);
        managed.activityState.status = "working";
        managed.activityState.lastActivityAt = new Date();
        events?.onStderr?.(text);
      });

      child.once("exit", (code, signal) => {
        managed.activityState.status = "idle";
        events?.onExit?.(code, signal);
      });
    });
  }

  async write(handle: ProviderHandle, message: string): Promise<void> {
    const process = this.processes.get(handle.id);
    if (!process) {
      throw new Error(`No process handle found: ${handle.id}`);
    }

    process.child.stdin.write(`${message}\n`);
    process.activityState.toolCallsCount += 1;
    process.activityState.lastActivityAt = new Date();
  }

  async getOutput(handle: ProviderHandle, lines?: number): Promise<string> {
    const process = this.processes.get(handle.id);
    if (!process) {
      return "";
    }

    const combined = [...process.stdoutChunks, ...process.stderrChunks].join("");
    if (!lines) {
      return combined;
    }

    const lineItems = combined.split(/\r?\n/);
    return lineItems.slice(-lines).join("\n");
  }

  async isAlive(handle: ProviderHandle): Promise<boolean> {
    const managedProcess = this.processes.get(handle.id);
    if (managedProcess) {
      return managedProcess.child.exitCode === null && !managedProcess.child.killed;
    }

    try {
      process.kill(handle.pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async getActivityState(handle: ProviderHandle): Promise<ActivityState | null> {
    const process = this.processes.get(handle.id);
    return process?.activityState ?? null;
  }

  async destroy(handle: ProviderHandle): Promise<void> {
    const managedProcess = this.processes.get(handle.id);
    if (managedProcess) {
      managedProcess.child.kill();
      this.processes.delete(handle.id);
      return;
    }

    try {
      process.kill(handle.pid);
    } catch {
      return;
    }
  }
}
