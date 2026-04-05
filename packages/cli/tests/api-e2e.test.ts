import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const base = dirname(fileURLToPath(import.meta.url));
const e2eCwd = "C:/Users/Lecoo/Desktop/allcli-e2e-test";
const workspaceRepoPath = resolve(base, "../../..");

const ctxMod = await import(pathToFileURL(resolve(base, "../dist/commands/context.js")).href);
const apiMod = await import(pathToFileURL(resolve(base, "../dist/api-server.js")).href);

const ctx = ctxMod.createCliContext(e2eCwd);
const port = 3583;
let srv;

function url(path) {
  return "http://localhost:" + port + path;
}

describe("API Server E2E", function () {
  beforeAll(async function () {
    srv = new apiMod.ApiServer(ctx, port);
    await srv.start();
  });

  afterAll(async function () {
    await srv.stop();
  });

  it("GET /api/status returns provider and counts", async function () {
    var res = await fetch(url("/api/status"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(data.provider).toBeDefined();
    expect(data.status).toBeDefined();
    expect(data.status.total).toBeGreaterThan(0);
  });

  it("GET /api/sessions returns real data", async function () {
    var res = await fetch(url("/api/sessions"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    var statuses = data.map(function (s) { return s.status; });
    expect(statuses).toContain("working");
    expect(statuses).toContain("done");
    expect(statuses).toContain("errored");
  });

  it("GET /api/tasks returns tasks with various statuses", async function () {
    var res = await fetch(url("/api/tasks"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    var statuses = data.map(function (t) { return t.status; });
    expect(statuses).toContain("pending");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("completed");
    expect(statuses).toContain("failed");
  });

  it("completed tasks have token usage data", async function () {
    var res = await fetch(url("/api/tasks"));
    var data = await res.json();
    var completed = data.filter(function (t) { return t.result !== undefined; });
    expect(completed.length).toBeGreaterThan(0);
    completed.forEach(function (task) {
      expect(task.result.tokensUsed).toBeGreaterThan(0);
      expect(task.result.duration).toBeGreaterThan(0);
      expect(typeof task.result.success).toBe("boolean");
    });
  });

  it("GET /api/worktrees returns worktree array", async function () {
    var res = await fetch(url("/api/worktrees"));
    expect(res.status).toBe(200);
    var data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("sessions have multiple providers", async function () {
    var res = await fetch(url("/api/sessions"));
    var data = await res.json();
    var providers = new Set(data.map(function (s) { return s.provider; }));
    expect(providers.size).toBeGreaterThanOrEqual(2);
  });

  it("POST then DELETE /api/repos/:id manages connected repositories", async function () {
    var createRes = await fetch(url("/api/repos"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: workspaceRepoPath })
    });
    expect(createRes.status).toBe(201);
    var created = await createRes.json();
    expect(created.id).toBeDefined();

    var listAfterCreateRes = await fetch(url("/api/repos"));
    expect(listAfterCreateRes.status).toBe(200);
    var listAfterCreate = await listAfterCreateRes.json();
    expect(listAfterCreate.some(function (repo) { return repo.id === created.id; })).toBe(true);

    var deleteRes = await fetch(url("/api/repos/" + created.id), {
      method: "DELETE"
    });
    expect(deleteRes.status).toBe(200);
    var deleted = await deleteRes.json();
    expect(deleted.ok).toBe(true);

    var listAfterDeleteRes = await fetch(url("/api/repos"));
    expect(listAfterDeleteRes.status).toBe(200);
    var listAfterDelete = await listAfterDeleteRes.json();
    expect(listAfterDelete.some(function (repo) { return repo.id === created.id; })).toBe(false);
  });

  it("DELETE /api/repos/:id rejects removing the default repository", async function () {
    var statusRes = await fetch(url("/api/status"));
    expect(statusRes.status).toBe(200);
    var status = await statusRes.json();

    var deleteRes = await fetch(url("/api/repos/" + status.repoId), {
      method: "DELETE"
    });
    expect(deleteRes.status).toBe(400);
    var data = await deleteRes.json();
    expect(data.error).toContain("default repository");
  });
});
