import { createCommandGate } from "./command-gate.js";

export const runLint = createCommandGate("lint", "pnpm", ["eslint", ".", "--ext", ".ts,.tsx"]);
