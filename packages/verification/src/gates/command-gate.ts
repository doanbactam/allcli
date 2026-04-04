import { execFile } from "node:child_process";
import type { ExecutionWorkspace, QualityGateResult, GateName } from "@allcli/core";

export function createCommandGate(
  gateName: GateName,
  command: string,
  args: string[]
): (workspace: ExecutionWorkspace) => Promise<QualityGateResult> {
  return function runGate(workspace: ExecutionWorkspace): Promise<QualityGateResult> {
    const start = Date.now();
    return new Promise<QualityGateResult>((resolve) => {
      execFile(
        command,
        args,
        { cwd: workspace.rootPath, shell: true },
        (error, stdout, stderr) => {
          const combined = (stdout + stderr).trim();
          const result: QualityGateResult = {
            passed: error === null,
            gate: gateName,
            duration: Date.now() - start
          };
          if (combined.length > 0) {
            result.output = combined;
          }
          resolve(result);
        }
      );
    });
  };
}
