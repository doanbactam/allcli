import type { Plugin, PluginSlot } from "./types/plugin.js";

export class PluginRegistry {
  private readonly pluginsBySlot = new Map<PluginSlot, Map<string, Plugin>>();

  register(plugin: Plugin): void {
    const existing = this.pluginsBySlot.get(plugin.slot) ?? new Map<string, Plugin>();
    existing.set(plugin.name, plugin);
    this.pluginsBySlot.set(plugin.slot, existing);
  }

  get<TPlugin extends Plugin>(slot: PluginSlot, name: string): TPlugin | undefined {
    const slotPlugins = this.pluginsBySlot.get(slot);
    return slotPlugins?.get(name) as TPlugin | undefined;
  }

  list(slot?: PluginSlot): Plugin[] {
    if (slot) {
      return [...(this.pluginsBySlot.get(slot)?.values() ?? [])];
    }

    return [...this.pluginsBySlot.values()].flatMap((entry) => [...entry.values()]);
  }
}
