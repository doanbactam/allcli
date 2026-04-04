import { resolve } from "node:path";
import { createCliContext } from "./context.js";
import { RalphLoop } from "@allcli/orchestrator";
import type { RalphLoopConfig } from "@allcli/orchestrator";
import { existsSync, readFileSync } from "node:fs";

export async function runLoop(cwd: string, options?: { prdPath?: string; maxIterations?: number }): Promise<void> {
  const context = createCliContext(cwd);
  const config = context.config;

  let initialPrompt = "Complete all tasks defined in the project.";

  if (options?.prdPath) {
    const prdFullPath = resolve(cwd, options.prdPath);
    if (!existsSync(prdFullPath)) {
      process.stderr.write(`PRD file not found: ${prdFullPath}\n`);
      process.exitCode = 1;
      return;
    }
    initialPrompt = readFileSync(prdFullPath, "utf8");
  }

  const loopConfig: RalphLoopConfig = {
    maxIterations: options?.maxIterations ?? config.orchestrator.maxIterations ?? 50,
    qualityGates: config.verification.gates,
    completionSignal: "COMPLETE",
    iterationTimeoutMs: config.orchestrator.iterationTimeoutMs ?? 600000,
    contextRefreshStrategy: config.orchestrator.contextRefresh ?? "fresh"
  };

  process.stdout.write(`Starting Ralph Loop (max ${loopConfig.maxIterations} iterations)...\n`);
  process.stdout.write(`  strategy: ${loopConfig.contextRefreshStrategy}\n`);
  process.stdout.write(`  gates: ${loopConfig.qualityGates.join(", ")}\n\n`);

  let iterationCount = 0;

  const loop = new RalphLoop(loopConfig, async (_iteration, loopContext) => {
    iterationCount = loopContext.iteration;
    process.stdout.write(`--- Iteration ${loopContext.iteration} ---\n`);
    process.stdout.write(`  learnings: ${loopContext.learnings.length}\n`);

    // Use the session manager to run the task through the provider
    const session = await context.manager.run(loopContext.prompt, {
      cwd: context.cwd,
      dangerous: config.providers[context.providerName].dangerous,
      outputFormat: config.providers[context.providerName].outputFormat,
      model: config.providers[context.providerName].model
    });

    // Wait for the session to complete
    const maxWait = loopConfig.iterationTimeoutMs;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const current = context.manager.getById(session.id);
      if (!current || current.status === "done" || current.status === "errored" || current.status === "killed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const final = context.manager.getById(session.id);
    return {
      output: final?.error ?? `Session ${final?.status ?? "unknown"}`,
      tokensUsed: 0,
      cost: 0,
      duration: Date.now() - start,
      ...(final?.status === "errored" && final.error ? { error: final.error } : {})
    };
  });

  const result = await loop.run(initialPrompt);

  process.stdout.write(`\n=== Ralph Loop Complete ===\n`);
  process.stdout.write(`  completed: ${result.completed}\n`);
  process.stdout.write(`  iterations: ${result.iterations.length}\n`);
  process.stdout.write(`  stop reason: ${result.stopReason}\n`);
  process.stdout.write(`  stories completed: ${result.storiesCompleted.length}\n`);
  process.stdout.write(`  stories failed: ${result.storiesFailed.length}\n`);
  if (result.learnings.length > 0) {
    process.stdout.write(`  learnings:\n`);
    for (const learning of result.learnings) {
      process.stdout.write(`    - ${learning}\n`);
    }
  }
}
