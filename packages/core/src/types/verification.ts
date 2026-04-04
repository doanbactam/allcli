export type GateName = "typecheck" | "lint" | "test" | "build";

export type GateType = "deterministic" | "non-deterministic";

export interface ExecutionWorkspace {
  rootPath: string;
  mode: "default" | "worktree";
  worktreeId?: string;
}

export interface QualityGate {
  name: GateName;
  type: GateType;
  check(workspace: ExecutionWorkspace): Promise<QualityGateResult>;
}

export interface QualityGateResult {
  passed: boolean;
  gate: GateName;
  output?: string;
  duration: number;
}

export interface GateRunSummary {
  workspace: ExecutionWorkspace;
  results: QualityGateResult[];
  allPassed: boolean;
  totalDuration: number;
}

export interface CostReport {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
}

export interface BudgetStatus {
  withinBudget: boolean;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}
