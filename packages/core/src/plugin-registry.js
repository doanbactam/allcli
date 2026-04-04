export class PluginRegistry {
    pluginsBySlot = new Map();
    register(plugin) {
        const existing = this.pluginsBySlot.get(plugin.slot) ?? new Map();
        existing.set(plugin.name, plugin);
        this.pluginsBySlot.set(plugin.slot, existing);
    }
    get(slot, name) {
        const slotPlugins = this.pluginsBySlot.get(slot);
        return slotPlugins?.get(name);
    }
    list(slot) {
        if (slot) {
            return [...(this.pluginsBySlot.get(slot)?.values() ?? [])];
        }
        return [...this.pluginsBySlot.values()].flatMap((entry) => [...entry.values()]);
    }
}
//# sourceMappingURL=plugin-registry.js.map