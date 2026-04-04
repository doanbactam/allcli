import { describe, expect, it } from "vitest";
import type { LoadedSkill } from "../src/skill-loader.js";
import { SkillRegistry } from "../src/skill-registry.js";
import { parseSkillFile } from "../src/skill-loader.js";
import { HookEngine } from "../src/hook-engine.js";

const MOCK_SKILL: LoadedSkill = {
  name: "debugging",
  description: "Debug assistant",
  triggers: ["debug", "bug", "fix"],
  category: "debugging",
  cost: "free",
  scope: "builtin",
  filePath: "/mock/debugging/SKILL.md",
  body: "# Debugging Instructions\n\nWhen debugging, always start with..."
};

describe("SkillRegistry", () => {
  it("registers and retrieves skills", () => {
    const registry = new SkillRegistry();
    registry.register(MOCK_SKILL);
    expect(registry.get("debugging")).toBe(MOCK_SKILL);
  });

  it("finds skills by trigger keyword", () => {
    const registry = new SkillRegistry();
    registry.register(MOCK_SKILL);
    const found = registry.findByTrigger("I need to debug this issue");
    expect(found).toHaveLength(1);
    expect(found[0]?.name).toBe("debugging");
  });

  it("returns empty array when no triggers match", () => {
    const registry = new SkillRegistry();
    registry.register(MOCK_SKILL);
    const found = registry.findByTrigger("write documentation");
    expect(found).toHaveLength(0);
  });

  it("lists all registered skills", () => {
    const registry = new SkillRegistry();
    registry.register(MOCK_SKILL);
    registry.register({ ...MOCK_SKILL, name: "tdd", triggers: ["test"] });
    expect(registry.list()).toHaveLength(2);
  });

  it("formats skill body", () => {
    const registry = new SkillRegistry();
    registry.register(MOCK_SKILL);
    expect(registry.formatBody("debugging")).toContain("Debugging Instructions");
    expect(registry.formatBody("nonexistent")).toBe("");
  });
});

describe("parseSkillFile", () => {
  it("parses YAML frontmatter and body", () => {
    const content = `---
name: my-skill
description: Test skill
triggers:
  - test
  - demo
category: quick
cost: free
scope: project
---
# My Skill

This is the skill body.`;

    const result = parseSkillFile(content, "/test/SKILL.md");
    expect(result.name).toBe("my-skill");
    expect(result.description).toBe("Test skill");
    expect(result.triggers).toEqual(["test", "demo"]);
    expect(result.category).toBe("quick");
    expect(result.body).toContain("My Skill");
  });

  it("throws on missing frontmatter", () => {
    expect(() => parseSkillFile("just text", "/test/SKILL.md")).toThrow("missing YAML frontmatter");
  });
});

describe("HookEngine", () => {
  it("fires hooks and returns results", async () => {
    const engine = new HookEngine();
    engine.register({
      event: "PreToolUse",
      handler: async () => ({ allowed: true, reason: "ok" })
    });

    const results = await engine.fire("PreToolUse", {
      event: "PreToolUse",
      sessionId: "test",
      agentName: "claude"
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.allowed).toBe(true);
  });

  it("stops firing when a hook denies", async () => {
    const engine = new HookEngine();
    engine.register({
      event: "PreToolUse",
      handler: async () => ({ allowed: false, reason: "blocked" })
    });
    engine.register({
      event: "PreToolUse",
      handler: async () => ({ allowed: true })
    });

    const results = await engine.fire("PreToolUse", {
      event: "PreToolUse",
      sessionId: "test",
      agentName: "claude"
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.allowed).toBe(false);
  });

  it("lists hooks by event", () => {
    const engine = new HookEngine();
    engine.register({
      event: "PreToolUse",
      handler: async () => ({ allowed: true })
    });
    engine.register({
      event: "PostToolUse",
      handler: async () => ({ allowed: true })
    });

    expect(engine.listHooks("PreToolUse")).toHaveLength(1);
    expect(engine.listHooks()).toHaveLength(2);
  });

  it("clears all hooks", async () => {
    const engine = new HookEngine();
    engine.register({
      event: "PreToolUse",
      handler: async () => ({ allowed: true })
    });
    engine.clear();
    expect(engine.listHooks()).toHaveLength(0);
  });
});
