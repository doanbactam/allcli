import { createCommandGate } from "./command-gate.js";

export const runBuild = createCommandGate("build", "pnpm", ["tsc", "-b"]);
