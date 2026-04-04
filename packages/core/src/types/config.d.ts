export type ProviderName = "claude" | "opencode" | "codex";
export interface ProviderConfig {
    command: string;
    model: string;
    dangerous: boolean;
    outputFormat: "text" | "stream-json";
}
export interface AllCliConfig {
    version: string;
    project: {
        name: string;
    };
    providers: {
        default: ProviderName;
        claude: ProviderConfig;
        opencode: ProviderConfig;
        codex: ProviderConfig;
    };
    orchestrator: {
        statePath: string;
        maxIterations?: number;
        iterationTimeoutMs?: number;
        contextRefresh?: "fresh" | "cumulative";
    };
    workspace: {
        baseBranch: string;
        isolation: "worktree" | "clone";
        autoCleanup: boolean;
    };
    skills: {
        directories: string[];
    };
    verification: {
        gates: ("typecheck" | "lint" | "test" | "build")[];
        costLimit: {
            perSession: number;
            perProject: number;
        };
    };
}
//# sourceMappingURL=config.d.ts.map