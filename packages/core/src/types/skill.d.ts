export type SkillCategory = "visual-engineering" | "ultrabrain" | "deep" | "quick" | "writing" | "artistry" | "debugging" | "testing" | "devops";
export type SkillCost = "free" | "cheap" | "expensive";
export type SkillScope = "project" | "user" | "builtin";
export interface SkillManifest {
    name: string;
    description: string;
    triggers: string[];
    category: SkillCategory;
    cost: SkillCost;
    scope: SkillScope;
    filePath: string;
}
export type HookEvent = "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "FileSave" | "PreCommit" | "PostCommit" | "QualityGate";
export interface Hook {
    event: HookEvent;
    handler: HookHandler;
    match?: {
        pattern: string;
        flags?: string[];
    };
}
export type HookHandler = (context: HookContext) => Promise<HookResult>;
export interface HookContext {
    event: HookEvent;
    tool?: string;
    filePath?: string;
    sessionId: string;
    agentName: string;
}
export interface HookResult {
    allowed: boolean;
    modified?: unknown;
    reason?: string;
}
//# sourceMappingURL=skill.d.ts.map