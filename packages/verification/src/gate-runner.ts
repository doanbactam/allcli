import type { ExecutionWorkspace, GateName, GateRunSummary, QualityGateResult } from "@allcli/core";
import { runTypeCheck } from "./gates/typecheck-gate.js";
import { runLint } from "./gates/lint-gate.js";
import { runTest } from "./gates/test-gate.js";
import { runBuild } from "./gates/build-gate.js";

const GATE_RUNNERS: Record<GateName, (workspace: ExecutionWorkspace) => Promise<QualityGateResult>> = {
  typecheck: runTypeCheck,
  lint: runLint,
  test: runTest,
  build: runBuild
};

export async function runGates(
  workspace: ExecutionWorkspace,
  gates: GateName[] = ["typecheck", "lint", "test", "build"]
): Promise<GateRunSummary> {
  const results: QualityGateResult[] = [];
  const start = Date.now();

  for (const gate of gates) {
    const runner = GATE_RUNNERS[gate];
    const result = await runner(workspace);
    results.push(result);

    if (!result.passed) {
      break;
    }
  }

  return {
    workspace,
    results,
    allPassed: results.every((r) => r.passed),
    totalDuration: Date.now() - start
  };
}
