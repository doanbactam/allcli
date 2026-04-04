import { createCommandGate } from "./command-gate.js";

export const runTypeCheck = createCommandGate("typecheck", "pnpm", ["tsc", "-b", "--pretty", "false"]);
