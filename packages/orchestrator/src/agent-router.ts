export type AgentRole = "planner" | "builder" | "reviewer" | "tester" | "general";

export interface AgentRoute {
  role: AgentRole;
  confidence: number;
  reasoning: string;
}

export interface AgentRouterConfig {
  rules?: RoutingRule[];
}

export interface RoutingRule {
  keywords: string[];
  role: AgentRole;
  priority: number;
}

const ROLE_ORDER: readonly AgentRole[] = ["planner", "builder", "reviewer", "tester", "general"];

const DEFAULT_RULES: readonly RoutingRule[] = [
  {
    role: "planner",
    priority: 5,
    keywords: ["plan", "design", "architecture", "research", "analyze", "investigate"]
  },
  {
    role: "builder",
    priority: 5,
    keywords: ["implement", "build", "create", "fix", "refactor", "add", "update"]
  },
  {
    role: "reviewer",
    priority: 4,
    keywords: ["review", "audit", "check", "verify", "approve"]
  },
  {
    role: "tester",
    priority: 4,
    keywords: ["test", "spec", "coverage", "validate"]
  }
];

interface RoleScore {
  score: number;
  matchedKeywords: string[];
}

export class AgentRouter {
  constructor(private readonly config?: AgentRouterConfig) {}

  route(taskDescription: string): AgentRoute {
    const normalized = normalize(taskDescription);
    const rules = this.getAllRules();
    const scores = this.scoreByRole(normalized, rules);
    const ranked = this.rankScores(scores);
    const top = ranked[0];

    if (!top || top.score <= 0) {
      return {
        role: "general",
        confidence: 0,
        reasoning: "No specific keywords matched"
      };
    }

    const maxPossibleScore = this.maxRoleScore(top.role, rules);
    const confidence = maxPossibleScore > 0 ? clamp01(top.score / maxPossibleScore) : 0;
    const reasoning = `Matched keywords for ${top.role}: ${top.matchedKeywords.join(", ")}`;

    return {
      role: top.role,
      confidence,
      reasoning
    };
  }

  rankRoles(taskDescription: string): AgentRoute[] {
    const normalized = normalize(taskDescription);
    const rules = this.getAllRules();
    const scores = this.scoreByRole(normalized, rules);

    return this.rankScores(scores).map((entry) => {
      const maxPossibleScore = this.maxRoleScore(entry.role, rules);
      const confidence = maxPossibleScore > 0 ? clamp01(entry.score / maxPossibleScore) : 0;
      const reasoning =
        entry.score > 0
          ? `Matched keywords for ${entry.role}: ${entry.matchedKeywords.join(", ")}`
          : "No matching keywords";

      return {
        role: entry.role,
        confidence,
        reasoning
      };
    });
  }

  private getAllRules(): RoutingRule[] {
    return [...DEFAULT_RULES, ...(this.config?.rules ?? [])];
  }

  private scoreByRole(taskDescription: string, rules: readonly RoutingRule[]): Record<AgentRole, RoleScore> {
    const scores: Record<AgentRole, RoleScore> = {
      planner: { score: 0, matchedKeywords: [] },
      builder: { score: 0, matchedKeywords: [] },
      reviewer: { score: 0, matchedKeywords: [] },
      tester: { score: 0, matchedKeywords: [] },
      general: { score: 0, matchedKeywords: [] }
    };

    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        const normalizedKeyword = normalize(keyword);
        if (taskDescription.includes(normalizedKeyword)) {
          scores[rule.role].score += rule.priority;
          scores[rule.role].matchedKeywords.push(keyword);
        }
      }
    }

    return scores;
  }

  private maxRoleScore(role: AgentRole, rules: readonly RoutingRule[]): number {
    let max = 0;
    for (const rule of rules) {
      if (rule.role !== role) {
        continue;
      }

      max += rule.priority * rule.keywords.length;
    }
    return max;
  }

  private rankScores(scores: Record<AgentRole, RoleScore>): Array<RoleScore & { role: AgentRole }> {
    return ROLE_ORDER.map((role) => ({ role, ...scores[role] })).sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
    });
  }
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
