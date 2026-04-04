import { resolve } from "node:path";
import { SkillRegistry } from "@allcli/skills";
import { loadConfig } from "@allcli/core";

export function listSkills(cwd: string): void {
  const config = loadConfig(cwd);
  const registry = new SkillRegistry();
  const skillDirs = config.skills.directories.map((d) => resolve(cwd, d));
  registry.loadFromDirectories(skillDirs);

  const skills = registry.list();
  if (skills.length === 0) {
    process.stdout.write("No skills found.\n");
    process.stdout.write("Add skills to directories configured in allcli.yaml under skills.directories\n");
    return;
  }

  for (const skill of skills) {
    const triggers = skill.triggers.slice(0, 4).join(", ");
    const suffix = skill.triggers.length > 4 ? ` +${skill.triggers.length - 4}` : "";
    process.stdout.write(
      `${skill.name}  ${skill.description}\n  category=${skill.category}  cost=${skill.cost}  triggers=[${triggers}${suffix}]\n\n`
    );
  }
}
