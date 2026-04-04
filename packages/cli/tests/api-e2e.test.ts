import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = dirname(fileURLToPath(import.meta.url));
const e2eCwd = resolve(tmpdir(), `allcli-e2e-test-${randomUUID()}`);

let ctx: unknown;
let srv: unknown;
const port = 3583;

function apiUrl(pathname: string) {
  return "http://localhost:" + port + pathname;
}

describe("API Server E2E", function () {
  beforeAll(async function () {
    mkdirSync(e2eCwd, { recursive: true });
    writeFileSync(resolve(e2eCwd, "allcli.yaml"), [
      'version: "1"',
      "project:",
      "  name: e2e-test",
      "providers:",
      "  default: claude",
      "  claude:",
      "    command: claude",
      "    model: sonnet",
      "    dangerous: true",
      "    outputFormat: text",
      "orchestrator:",
      "  statePath: .allcli/sessions.json",
      "  maxIterations: 50",
      "  iterationTimeoutMs: 600000",
      "  contextRefresh: fresh",
      "workspace:",
      "  baseBranch: main",
      "  isolation: worktree",
      "  autoCleanup: true",
      "verification:",
      "  gates:",
      "    - typecheck",
      "    - lint",
      "    - test",
      "    - build",
      "  costLimit:",
      "    perSession: 10",
      "    perProject: 100",
    ].join("\n"));

    // Initialize git repo for worktree support
    execFileSync("git", ["init"], { cwd: e2eCwd, encoding: "utf8" });
    execFileSync("git", ["config", "user.email", "test@allcli.dev"], { cwd: e2eCwd, encoding: "utf8" });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: e2eCwd, encoding: "utf8" });
    writeFileSync(resolve(e2eCwd, ".gitkeep"), "");
    execFileSync("git", ["add", ".gitkeep"], { cwd: e2eCwd, encoding: "utf8" });
    execFileSync("git", ["commit", "-m", "init"], { cwd: e2eCwd, encoding: "utf8" });

    const ctxMod = await import(pathToFileURL(resolve(base, "../dist/commands/context.js")).href);
    const apiMod = await import(pathToFileURL(resolve(base, "../dist/api-server.js")).href);
    ctx = ctxMod.createCliContext(e2eCwd);
    srv = new apiMod.ApiServer(ctx, port);
    await srv.start();
  });

  afterAll(async function () {
    await srv.stop();
    rmSync(e2eCwd, { recursive: true, force: true });
  });

  it("GET /api/status returns provider and counts", async function () {
    var res = await fetch(apiUrl("/api/status"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(data.provider).toBeDefined();
    expect(data.status).toBeDefined();
    expect(data.status.total).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/sessions returns array", async function () {
    var res = await fetch(apiUrl("/api/sessions"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/tasks returns array", async function () {
    var res = await fetch(apiUrl("/api/tasks"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("completed tasks have token usage data when present", async function () {
    var res = await fetch(apiUrl("/api/tasks"));
    var data = await res.json();
    var completed = data.filter(function (t: Record<string, unknown>) { return t.result !== undefined; });
    completed.forEach(function (task: Record<string, unknown>) {
      expect(task.result.tokensUsed).toBeGreaterThan(0);
      expect(task.result.duration).toBeGreaterThan(0);
      expect(typeof task.result.success).toBe("boolean");
    });
  });

  it("GET /api/worktrees returns array", async function () {
    var res = await fetch(apiUrl("/api/worktrees"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/sessions returns array for provider check", async function () {
    var res = await fetch(apiUrl("/api/sessions"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
