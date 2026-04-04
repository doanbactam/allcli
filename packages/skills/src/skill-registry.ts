import type { SkillManifest } from "@allcli/core";
import { loadSkillsFromDirectories, type LoadedSkill } from "./skill-loader.js";

export class SkillRegistry {
  private readonly skills = new Map<string, LoadedSkill>();
  private readonly triggerIndex = new Map<string, string[]>();

  loadFromDirectories(dirs: string[]): number {
    const loaded = loadSkillsFromDirectories(dirs);
    for (const skill of loaded) {
      this.register(skill);
    }
    return loaded.length;
  }

  register(skill: LoadedSkill): void {
    this.skills.set(skill.name, skill);
    for (const trigger of skill.triggers) {
      const normalized = trigger.toLowerCase();
      const existing = this.triggerIndex.get(normalized) ?? [];
      if (!existing.includes(skill.name)) {
        existing.push(skill.name);
      }
      this.triggerIndex.set(normalized, existing);
    }
  }

  get(name: string): LoadedSkill | undefined {
    return this.skills.get(name);
  }

  list(): LoadedSkill[] {
    return [...this.skills.values()];
  }

  findByTrigger(text: string): LoadedSkill[] {
    const lowerText = text.toLowerCase();
    const matchedNames = new Set<string>();

    for (const [trigger, names] of this.triggerIndex) {
      if (lowerText.includes(trigger)) {
        for (const name of names) {
          matchedNames.add(name);
        }
      }
    }

    return [...matchedNames]
      .map((name) => this.skills.get(name))
      .filter((s): s is LoadedSkill => s !== undefined);
  }

  formatBody(skillName: string): string {
    const skill = this.skills.get(skillName);
    return skill?.body ?? "";
  }
}
