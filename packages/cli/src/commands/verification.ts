import { resolve } from "node:path";
import { loadConfig } from "@allcli/core";
import type { GateName } from "@allcli/core";
import { runGates } from "@allcli/verification";

export async function verificationCheck(cwd: string): Promise<void> {
  const config = loadConfig(cwd);
  const gates = config.verification.gates as GateName[];

  process.stdout.write(`Running ${gates.length} quality gates...\n\n`);

  const summary = await runGates(
    { rootPath: resolve(cwd), mode: "default" },
    gates
  );

  for (const result of summary.results) {
    const icon = result.passed ? "\u2713" : "\u2717";
    const duration = `${result.duration}ms`;
    const firstLine = result.output ? result.output.split("\n")[0] ?? "" : "";
    const outputSuffix = firstLine ? `\n    ${firstLine.slice(0, 80)}` : "";
    process.stdout.write(`  ${icon} ${result.gate} (${duration})${outputSuffix}\n`);
  }

  process.stdout.write("\n");
  if (summary.allPassed) {
    process.stdout.write(`All gates passed (${summary.totalDuration}ms total)\n`);
  } else {
    process.stdout.write(`Some gates failed (${summary.totalDuration}ms total)\n`);
    process.exitCode = 1;
  }
}
