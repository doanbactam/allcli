import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config-loader.js";

describe("loadConfig", () => {
  it("loads config from allcli.yaml", () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-config-"));
    const file = join(root, "allcli.yaml");
    writeFileSync(
      file,
      [
        "version: \"1\"",
        "project:",
        "  name: demo",
        "providers:",
        "  default: claude",
        "  claude:",
        "    command: claude",
        "    model: sonnet",
        "    dangerous: true",
        "    outputFormat: text",
        "orchestrator:",
        "  statePath: .allcli/sessions.json"
      ].join("\n")
    );

    const config = loadConfig(root);
    expect(config.project.name).toBe("demo");
    expect(config.providers.default).toBe("claude");

    rmSync(root, { recursive: true, force: true });
  });

  it("applies defaults when optional config values are missing", () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-config-default-"));
    const file = join(root, "allcli.yaml");
    writeFileSync(file, "providers:\n  default: claude\n");

    const config = loadConfig(root);
    expect(config.providers.claude.command).toBe("claude");
    expect(config.orchestrator.statePath).toBe(".allcli/sessions.json");

    rmSync(root, { recursive: true, force: true });
  });
});
