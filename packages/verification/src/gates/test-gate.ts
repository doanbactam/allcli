import { createCommandGate } from "./command-gate.js";

export const runTest = createCommandGate("test", "pnpm", ["vitest", "run"]);
