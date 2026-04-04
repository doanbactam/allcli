import { execFile } from "node:child_process";
import type { ExecutionWorkspace, QualityGateResult } from "@allcli/core";

export async function runTest(workspace: ExecutionWorkspace): Promise<QualityGateResult> {
  const start = Date.now();
  return new Promise<QualityGateResult>((resolve) => {
    execFile(
      "pnpm",
      ["vitest", "run"],
      { cwd: workspace.rootPath, shell: true },
      (error, stdout, stderr) => {
        const combined = (stdout + stderr).trim();
        const result: QualityGateResult = {
          passed: error === null,
          gate: "test",
          duration: Date.now() - start
        };
        if (combined.length > 0) {
          result.output = combined;
        }
        resolve(result);
      }
    );
  });
}
