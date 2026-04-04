import type { Hook, HookContext, HookEvent, HookResult } from "@allcli/core";

export class HookEngine {
  private readonly hooks = new Map<HookEvent, Hook[]>();

  register(hook: Hook): void {
    const existing = this.hooks.get(hook.event) ?? [];
    existing.push(hook);
    this.hooks.set(hook.event, existing);
  }

  async fire(event: HookEvent, context: HookContext): Promise<HookResult[]> {
    const hooks = this.hooks.get(event) ?? [];
    if (hooks.length === 0) {
      return [];
    }

    const results: HookResult[] = [];
    for (const hook of hooks) {
      if (hook.match && context.filePath) {
        const flags = hook.match.flags?.join("") ?? "";
        const regex = new RegExp(hook.match.pattern, flags);
        if (!regex.test(context.filePath)) {
          continue;
        }
      }

      const result = await hook.handler(context);
      results.push(result);

      if (!result.allowed) {
        break;
      }
    }

    return results;
  }

  listHooks(event?: HookEvent): Hook[] {
    if (event) {
      return this.hooks.get(event) ?? [];
    }

    return [...this.hooks.values()].flat();
  }

  clear(): void {
    this.hooks.clear();
  }
}
