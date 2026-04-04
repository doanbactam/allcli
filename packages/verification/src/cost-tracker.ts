import type { BudgetStatus, CostReport } from "@allcli/core";

interface SessionCostEntry {
  sessionId: string;
  report: CostReport;
  timestamp: string;
}

export class CostTracker {
  private readonly entries: SessionCostEntry[] = [];
  private readonly projectLimit: number;
  private readonly sessionLimit: number;

  constructor(projectLimit: number = 100, sessionLimit: number = 10) {
    this.projectLimit = projectLimit;
    this.sessionLimit = sessionLimit;
  }

  record(sessionId: string, report: CostReport): void {
    this.entries.push({
      sessionId,
      report,
      timestamp: new Date().toISOString()
    });
  }

  getSessionCost(sessionId: string): CostReport {
    const entry = this.entries.find((e) => e.sessionId === sessionId);
    if (!entry) {
      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        currency: "USD"
      };
    }
    return entry.report;
  }

  getProjectCost(): CostReport {
    const totals = this.entries.reduce(
      (acc, e) => ({
        totalTokens: acc.totalTokens + e.report.totalTokens,
        inputTokens: acc.inputTokens + e.report.inputTokens,
        outputTokens: acc.outputTokens + e.report.outputTokens,
        estimatedCost: acc.estimatedCost + e.report.estimatedCost
      }),
      { totalTokens: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0 }
    );

    return { ...totals, currency: "USD" };
  }

  checkBudget(sessionId: string): BudgetStatus {
    const sessionCost = this.getSessionCost(sessionId).estimatedCost;
    const projectCost = this.getProjectCost().estimatedCost;

    const used = sessionCost + projectCost;
    const remaining = this.sessionLimit - sessionCost;
    const percentUsed = this.sessionLimit > 0 ? Math.round((sessionCost / this.sessionLimit) * 100) : 0;

    return {
      withinBudget: sessionCost <= this.sessionLimit && projectCost <= this.projectLimit,
      used,
      limit: this.sessionLimit,
      remaining: Math.max(0, remaining),
      percentUsed
    };
  }
}
