export type PluginSlot =
  | "runtime"
  | "agent"
  | "tool"
  | "workspace"
  | "tracker"
  | "scm"
  | "notifier"
  | "terminal";

export interface Plugin<TConfig = Record<string, unknown>> {
  readonly name: string;
  readonly slot: PluginSlot;
  readonly version: string;
  configure(config: TConfig): void;
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
}
