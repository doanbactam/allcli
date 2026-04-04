import { describe, expect, it } from "vitest";
import { OpenCodeProvider } from "../src/opencode-provider.js";
import { CodexProvider } from "../src/codex-provider.js";

describe("OpenCodeProvider", () => {
  it("has correct name and models", () => {
    const provider = new OpenCodeProvider();
    expect(provider.name).toBe("opencode");
    expect(provider.supportedModels).toContain("anthropic/claude-sonnet-4");
  });
});

describe("CodexProvider", () => {
  it("has correct name and models", () => {
    const provider = new CodexProvider();
    expect(provider.name).toBe("codex");
    expect(provider.supportedModels).toContain("gpt-5-codex");
  });
});
