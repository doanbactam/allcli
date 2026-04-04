export type ActivityStatus = "idle" | "working" | "waiting_input";
export interface ActivityState {
    status: ActivityStatus;
    lastActivityAt: Date;
    toolCallsCount: number;
}
export interface ProviderHandle {
    id: string;
    pid: number;
    command: string;
    cwd: string;
    startedAt: Date;
}
export interface SpawnConfig {
    readonly command?: string;
    readonly prompt: string;
    readonly model?: string;
    readonly cwd: string;
    readonly dangerouslySkipPermissions?: boolean;
    readonly outputFormat?: "text" | "stream-json";
}
export interface SpawnEvents {
    onStdout?: (chunk: string) => void;
    onStderr?: (chunk: string) => void;
    onExit?: (code: number | null, signal: string | null) => void;
    onError?: (error: Error) => void;
}
export interface Provider {
    readonly name: string;
    readonly supportedModels: readonly string[];
    spawn(config: SpawnConfig, events?: SpawnEvents): Promise<ProviderHandle>;
    sendMessage(handle: ProviderHandle, message: string): Promise<void>;
    getOutput(handle: ProviderHandle, lines?: number): Promise<string>;
    isAlive(handle: ProviderHandle): Promise<boolean>;
    getActivityState(handle: ProviderHandle): Promise<ActivityState | null>;
    destroy(handle: ProviderHandle): Promise<void>;
}
//# sourceMappingURL=provider.d.ts.map