import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import type { SkillCategory, SkillCost, SkillManifest, SkillScope } from "@allcli/core";

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

export interface LoadedSkill extends SkillManifest {
  body: string;
}

export function parseSkillFile(content: string, filePath: string): LoadedSkill {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    throw new Error(`Skill file missing YAML frontmatter: ${filePath}`);
  }

  const frontmatterRaw = match[1];
  const bodyRaw = match[2];
  if (frontmatterRaw === undefined || bodyRaw === undefined) {
    throw new Error(`Skill file has malformed frontmatter: ${filePath}`);
  }

  const frontmatter = YAML.parse(frontmatterRaw) as Record<string, unknown>;
  const body = bodyRaw.trim();

  return {
    name: String(frontmatter.name ?? ""),
    description: String(frontmatter.description ?? ""),
    triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers.map(String) : [],
    category: (frontmatter.category as SkillCategory) ?? "quick",
    cost: (frontmatter.cost as SkillCost) ?? "free",
    scope: (frontmatter.scope as SkillScope) ?? "project",
    filePath,
    body
  };
}

export function loadSkillFromFile(filePath: string): LoadedSkill | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf8");
  return parseSkillFile(content, filePath);
}

export function loadSkillsFromDirectory(dirPath: string): LoadedSkill[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const skills: LoadedSkill[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const skillFile = join(fullPath, "SKILL.md");
      const loaded = loadSkillFromFile(skillFile);
      if (loaded) {
        skills.push(loaded);
      }
    } else if (entry.endsWith(".md")) {
      const loaded = loadSkillFromFile(fullPath);
      if (loaded) {
        skills.push(loaded);
      }
    }
  }

  return skills;
}

export function loadSkillsFromDirectories(dirs: string[]): LoadedSkill[] {
  return dirs.flatMap(loadSkillsFromDirectory);
}
