import type { Plugin, PluginSlot } from "./types/plugin.js";
export declare class PluginRegistry {
    private readonly pluginsBySlot;
    register(plugin: Plugin): void;
    get<TPlugin extends Plugin>(slot: PluginSlot, name: string): TPlugin | undefined;
    list(slot?: PluginSlot): Plugin[];
}
//# sourceMappingURL=plugin-registry.d.ts.map