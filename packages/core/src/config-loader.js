import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { z } from "zod";
const providerConfigSchema = z.object({
    command: z.string(),
    model: z.string(),
    dangerous: z.boolean().default(false),
    outputFormat: z.enum(["text", "stream-json"]).default("text")
});
const configSchema = z.object({
    version: z.string().default("1"),
    project: z
        .object({
        name: z.string().default("allcli")
    })
        .default({ name: "allcli" }),
    providers: z.object({
        default: z.enum(["claude", "opencode", "codex"]).default("claude"),
        claude: providerConfigSchema.default({
            command: "claude",
            model: "sonnet",
            dangerous: true,
            outputFormat: "text"
        }),
        opencode: providerConfigSchema.default({
            command: "opencode",
            model: "anthropic/claude-sonnet-4",
            dangerous: false,
            outputFormat: "text"
        }),
        codex: providerConfigSchema.default({
            command: "codex",
            model: "gpt-5-codex",
            dangerous: false,
            outputFormat: "text"
        })
    }),
    orchestrator: z
        .object({
        statePath: z.string().default(".allcli/sessions.json"),
        maxIterations: z.number().optional().default(50),
        iterationTimeoutMs: z.number().optional().default(600000),
        contextRefresh: z.enum(["fresh", "cumulative"]).optional().default("fresh")
    })
        .default({ statePath: ".allcli/sessions.json", maxIterations: 50, iterationTimeoutMs: 600000, contextRefresh: "fresh" }),
    workspace: z
        .object({
        baseBranch: z.string().default("main"),
        isolation: z.enum(["worktree", "clone"]).default("worktree"),
        autoCleanup: z.boolean().default(true)
    })
        .default({ baseBranch: "main", isolation: "worktree", autoCleanup: true }),
    skills: z
        .object({
        directories: z.array(z.string()).default([".allcli/skills"])
    })
        .default({ directories: [".allcli/skills"] }),
    verification: z
        .object({
        gates: z
            .array(z.enum(["typecheck", "lint", "test", "build"]))
            .default(["typecheck", "lint", "test", "build"]),
        costLimit: z
            .object({
            perSession: z.number().default(10),
            perProject: z.number().default(100)
        })
            .default({ perSession: 10, perProject: 100 })
    })
        .default({
        gates: ["typecheck", "lint", "test", "build"],
        costLimit: { perSession: 10, perProject: 100 }
    })
});
export function loadConfig(cwd = process.cwd()) {
    const configPath = join(cwd, "allcli.yaml");
    if (!existsSync(configPath)) {
        throw new Error(`Missing config file: ${configPath}`);
    }
    const raw = readFileSync(configPath, "utf8");
    const parsed = YAML.parse(raw);
    return configSchema.parse(parsed);
}
export function resolveProviderName(config, override) {
    if (!override) {
        return config.providers.default;
    }
    const normalized = override.toLowerCase();
    if (normalized !== "claude" && normalized !== "opencode" && normalized !== "codex") {
        throw new Error(`Unknown provider: ${override}. Supported: claude, opencode, codex`);
    }
    return normalized;
}
//# sourceMappingURL=config-loader.js.map