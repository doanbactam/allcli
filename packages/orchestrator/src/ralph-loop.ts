export interface RalphLoopConfig {
  maxIterations: number;
  qualityGates: string[];
  completionSignal: string;
  iterationTimeoutMs: number;
  contextRefreshStrategy: "fresh" | "cumulative";
}

export interface RalphLoopIteration {
  number: number;
  status: "success" | "failed" | "timeout" | "gates_failed";
  output?: string;
  duration: number;
  tokensUsed: number;
  timestamp: string;
}

export interface RalphLoopResult {
  completed: boolean;
  iterations: RalphLoopIteration[];
  totalTokensUsed: number;
  totalCost: number;
  storiesCompleted: string[];
  storiesFailed: string[];
  learnings: string[];
  stopReason: "completed" | "max_iterations" | "budget_exceeded" | "error";
}

export interface LoopContext {
  iteration: number;
  prompt: string;
  learnings: string[];
  previousOutputs: string[];
  strategy: "fresh" | "cumulative";
}

export interface IterationResult {
  output: string;
  tokensUsed: number;
  cost: number;
  duration: number;
  error?: string;
}

const DEFAULT_CONFIG: RalphLoopConfig = {
  maxIterations: 50,
  qualityGates: ["typecheck", "lint", "test", "build"],
  completionSignal: "COMPLETE",
  iterationTimeoutMs: 600_000,
  contextRefreshStrategy: "fresh"
};

export class RalphLoop {
  private readonly effectiveConfig: RalphLoopConfig;

  constructor(
    private readonly config: RalphLoopConfig,
    private readonly onIteration: (iteration: number, context: LoopContext) => Promise<IterationResult>
  ) {
    this.effectiveConfig = {
      maxIterations: config.maxIterations ?? DEFAULT_CONFIG.maxIterations,
      qualityGates: config.qualityGates ?? DEFAULT_CONFIG.qualityGates,
      completionSignal: config.completionSignal ?? DEFAULT_CONFIG.completionSignal,
      iterationTimeoutMs: config.iterationTimeoutMs ?? DEFAULT_CONFIG.iterationTimeoutMs,
      contextRefreshStrategy: config.contextRefreshStrategy ?? DEFAULT_CONFIG.contextRefreshStrategy
    };
  }

  async run(initialPrompt: string): Promise<RalphLoopResult> {
    const iterations: RalphLoopIteration[] = [];
    const previousOutputs: string[] = [];
    const learnings: string[] = [];
    const storiesCompleted: string[] = [];
    const storiesFailed: string[] = [];

    let totalTokensUsed = 0;
    let totalCost = 0;
    let completed = false;
    let stopReason: RalphLoopResult["stopReason"] = "max_iterations";

    for (let iteration = 1; iteration <= this.effectiveConfig.maxIterations; iteration += 1) {
      const context = this.buildContext(iteration, initialPrompt, learnings, previousOutputs);

      try {
        const result = await this.onIteration(iteration, context);
        const isTimeout = result.duration > this.effectiveConfig.iterationTimeoutMs;
        const status = this.resolveStatus(result, isTimeout);

        iterations.push({
          number: iteration,
          status,
          output: result.output,
          duration: result.duration,
          tokensUsed: result.tokensUsed,
          timestamp: new Date().toISOString()
        });

        totalTokensUsed += result.tokensUsed;
        totalCost += result.cost;
        previousOutputs.push(result.output);

        const extractedLearnings = extractByPrefix(result.output, "LEARNING:");
        learnings.push(...extractedLearnings);

        storiesCompleted.push(...extractByPrefix(result.output, "STORY_COMPLETED:"));
        storiesFailed.push(...extractByPrefix(result.output, "STORY_FAILED:"));

        if (result.output.includes("BUDGET_EXCEEDED")) {
          stopReason = "budget_exceeded";
          break;
        }

        if (result.error) {
          stopReason = "error";
          break;
        }

        if (result.output.includes(this.effectiveConfig.completionSignal)) {
          completed = true;
          stopReason = "completed";
          break;
        }
      } catch (error) {
        const output = error instanceof Error ? error.message : "Unknown iteration error";
        iterations.push({
          number: iteration,
          status: "failed",
          output,
          duration: 0,
          tokensUsed: 0,
          timestamp: new Date().toISOString()
        });
        stopReason = "error";
        break;
      }
    }

    return {
      completed,
      iterations,
      totalTokensUsed,
      totalCost,
      storiesCompleted,
      storiesFailed,
      learnings,
      stopReason
    };
  }

  private buildContext(
    iteration: number,
    initialPrompt: string,
    learnings: string[],
    previousOutputs: string[]
  ): LoopContext {
    if (this.effectiveConfig.contextRefreshStrategy === "fresh") {
      const prompt = composePrompt(initialPrompt, learnings, []);
      return {
        iteration,
        prompt,
        learnings: [...learnings],
        previousOutputs: [],
        strategy: "fresh"
      };
    }

    const prompt = composePrompt(initialPrompt, learnings, previousOutputs);
    return {
      iteration,
      prompt,
      learnings: [...learnings],
      previousOutputs: [...previousOutputs],
      strategy: "cumulative"
    };
  }

  private resolveStatus(result: IterationResult, isTimeout: boolean): RalphLoopIteration["status"] {
    if (isTimeout) {
      return "timeout";
    }

    if (result.error) {
      return "failed";
    }

    if (hasGateFailure(result.output, this.effectiveConfig.qualityGates)) {
      return "gates_failed";
    }

    return "success";
  }
}

function hasGateFailure(output: string, qualityGates: string[]): boolean {
  const normalizedOutput = output.toLowerCase();

  if (normalizedOutput.includes("gates_failed") || normalizedOutput.includes("gate_failed")) {
    return true;
  }

  return qualityGates.some((gate) => normalizedOutput.includes(`${gate.toLowerCase()}: fail`));
}

function extractByPrefix(output: string, prefix: string): string[] {
  const extracted: string[] = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) {
      continue;
    }

    const value = trimmed.slice(prefix.length).trim();
    if (value.length > 0) {
      extracted.push(value);
    }
  }

  return extracted;
}

function composePrompt(basePrompt: string, learnings: string[], previousOutputs: string[]): string {
  const parts = [basePrompt.trim()];

  if (learnings.length > 0) {
    parts.push(`Known learnings:\n${learnings.map((learning) => `- ${learning}`).join("\n")}`);
  }

  if (previousOutputs.length > 0) {
    parts.push(`Previous outputs:\n${previousOutputs.join("\n---\n")}`);
  }

  return parts.join("\n\n");
}
