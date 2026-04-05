import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import type { CliContext } from "./commands/context.js";
import { RepoHub } from "./repo-hub.js";

type JsonBody = Record<string, unknown>;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function jsonResponse(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJsonBody(req: IncomingMessage): Promise<JsonBody | undefined> {
  return readBody(req).then((raw) => {
    if (!raw.trim()) return undefined;
    return JSON.parse(raw) as JsonBody;
  });
}

export class ApiServer {
  private readonly server: Server;
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<WebSocket>();
  private readonly repoHub: RepoHub;

  constructor(
    private readonly context: CliContext,
    private readonly port: number,
    private readonly dashboardDistDir?: string
  ) {
    this.server = createServer((req, res) => this.handleRequest(req, res));
    this.wss = new WebSocketServer({ server: this.server });
    this.repoHub = new RepoHub(context.cwd, (message) => this.broadcast(message));

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.on("close", () => this.clients.delete(ws));
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        process.stdout.write(`  API server: http://localhost:${this.port}\n`);
        if (this.dashboardDistDir) {
          process.stdout.write(`  Dashboard:  http://localhost:${this.port}\n`);
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    for (const ws of this.clients) {
      ws.close();
    }
    this.clients.clear();

    return new Promise((resolve, reject) => {
      this.wss.close((err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        this.server.close((serverError) => {
          if (serverError) {
            reject(serverError);
            return;
          }

          resolve();
        });
      });
    });
  }

  get address(): string {
    return `http://localhost:${this.port}`;
  }

  private broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
    const pathname = url.pathname;

    // API routes
    if (pathname.startsWith("/api/")) {
      try {
        await this.handleApiRoute(req, res, url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        jsonResponse(res, { error: message }, 500);
      }
      return;
    }

    // WebSocket upgrade is handled by ws automatically
    // Static file serving for dashboard
    if (this.dashboardDistDir) {
      this.serveStatic(pathname, res);
      return;
    }

    jsonResponse(res, { error: "Not found" }, 404);
  }

  private async handleApiRoute(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): Promise<void> {
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    const defaultRepoId = this.repoHub.defaultRepoId;

    if (pathname === "/api/repos" && method === "GET") {
      jsonResponse(res, this.repoHub.listRepos());
      return;
    }

    if (pathname === "/api/repos" && method === "POST") {
      const body = await parseJsonBody(req);
      const path = body?.["path"];
      if (typeof path !== "string" || !path.trim()) {
        jsonResponse(res, { error: "path is required" }, 400);
        return;
      }

      jsonResponse(res, this.repoHub.addRepo(path.trim()), 201);
      return;
    }

    const repoRoute = this.matchRepoRoute(pathname);
    if (repoRoute) {
      await this.handleRepoRoute(req, res, repoRoute.repoId, repoRoute.remainder, url);
      return;
    }

    // GET /api/status
    if (pathname === "/api/status" && method === "GET") {
      const repoContext = this.repoHub.getContext(defaultRepoId);
      jsonResponse(res, {
        status: this.repoHub.getStatus(defaultRepoId),
        provider: repoContext.providerName,
        workspace: repoContext.config.workspace,
        orchestrator: repoContext.config.orchestrator,
        repoId: defaultRepoId
      });
      return;
    }

    // GET /api/sessions
    if (pathname === "/api/sessions" && method === "GET") {
      jsonResponse(res, this.repoHub.listSessions(defaultRepoId));
      return;
    }

    // GET /api/tasks
    if (pathname === "/api/tasks" && method === "GET") {
      jsonResponse(res, this.repoHub.listTasks(defaultRepoId));
      return;
    }

    // POST /api/tasks
    if (pathname === "/api/tasks" && method === "POST") {
      await this.handleTaskCreate(req, res, defaultRepoId);
      return;
    }

    // GET /api/worktrees
    if (pathname === "/api/worktrees" && method === "GET") {
      jsonResponse(res, await this.repoHub.listWorktrees(defaultRepoId));
      return;
    }

    // GET /api/inbox
    if (pathname === "/api/inbox" && method === "GET") {
      jsonResponse(res, await this.repoHub.listInbox(defaultRepoId));
      return;
    }

    jsonResponse(res, { error: "Not found" }, 404);
  }

  private serveStatic(pathname: string, res: ServerResponse): void {
    if (!this.dashboardDistDir) {
      jsonResponse(res, { error: "No dashboard directory configured" }, 404);
      return;
    }

    // Default to index.html for SPA routing
    let filePath = join(this.dashboardDistDir, pathname === "/" ? "index.html" : pathname);

    const resolved = resolve(filePath);
    if (!resolved.startsWith(resolve(this.dashboardDistDir))) {
      jsonResponse(res, { error: "Forbidden" }, 403);
      return;
    }

    if (!existsSync(resolved) || statSync(resolved).isDirectory()) {
      // SPA fallback: serve index.html for unknown routes
      filePath = join(this.dashboardDistDir, "index.html");
    }

    if (!existsSync(filePath)) {
      jsonResponse(res, { error: "Not found" }, 404);
      return;
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    try {
      const content = readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
      });
      res.end(content);
    } catch {
      jsonResponse(res, { error: "Failed to read file" }, 500);
    }
  }

  private async handleRepoRoute(
    req: IncomingMessage,
    res: ServerResponse,
    repoId: string,
    remainder: string,
    url: URL
  ): Promise<void> {
    const method = req.method ?? "GET";

    if (!remainder && method === "GET") {
      const repo = this.repoHub.listRepos().find((item) => item.id === repoId);
      if (!repo) {
        jsonResponse(res, { error: "Repository not found" }, 404);
        return;
      }

      jsonResponse(res, repo);
      return;
    }

    if (!remainder && method === "DELETE") {
      const repo = this.repoHub.listRepos().find((item) => item.id === repoId);
      if (!repo) {
        jsonResponse(res, { error: "Repository not found" }, 404);
        return;
      }

      try {
        this.repoHub.removeRepo(repoId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove repository";
        jsonResponse(res, { error: message }, message.includes("default repository") ? 400 : 500);
        return;
      }

      jsonResponse(res, { ok: true });
      return;
    }

    if (remainder === "status" && method === "GET") {
      const context = this.repoHub.getContext(repoId);
      jsonResponse(res, {
        status: this.repoHub.getStatus(repoId),
        provider: context.providerName,
        workspace: context.config.workspace,
        orchestrator: context.config.orchestrator,
        repoId
      });
      return;
    }

    if (remainder === "sessions" && method === "GET") {
      jsonResponse(res, this.repoHub.listSessions(repoId));
      return;
    }

    if (remainder.startsWith("sessions/") && remainder.endsWith("/kill") && method === "POST") {
      const sessionId = decodeURIComponent(remainder.slice("sessions/".length, -"/kill".length));
      await this.repoHub.killSession(repoId, sessionId);
      jsonResponse(res, { ok: true });
      return;
    }

    if (remainder === "tasks" && method === "GET") {
      jsonResponse(res, this.repoHub.listTasks(repoId));
      return;
    }

    if (remainder === "tasks" && method === "POST") {
      await this.handleTaskCreate(req, res, repoId);
      return;
    }

    if (remainder === "worktrees" && method === "GET") {
      jsonResponse(res, await this.repoHub.listWorktrees(repoId));
      return;
    }

    if (remainder === "worktrees" && method === "POST") {
      const body = await parseJsonBody(req);
      const name = body?.["name"];
      if (typeof name !== "string" || !name.trim()) {
        jsonResponse(res, { error: "name is required" }, 400);
        return;
      }

      jsonResponse(res, await this.repoHub.createWorktree(repoId, name.trim()), 201);
      return;
    }

    if (remainder === "files" && method === "GET") {
      const path = url.searchParams.get("path") ?? "";
      jsonResponse(res, await this.repoHub.listFiles(repoId, path));
      return;
    }

    if (remainder === "file" && method === "GET") {
      const path = url.searchParams.get("path");
      if (!path) {
        jsonResponse(res, { error: "path is required" }, 400);
        return;
      }

      jsonResponse(res, await this.repoHub.readFile(repoId, path));
      return;
    }

    if (remainder === "run" && method === "POST") {
      const body = await parseJsonBody(req);
      const task = body?.["task"];
      if (typeof task !== "string" || !task.trim()) {
        jsonResponse(res, { error: "task is required" }, 400);
        return;
      }

      jsonResponse(res, await this.repoHub.runPrompt(repoId, task.trim()), 201);
      return;
    }

    if (remainder === "agent" && method === "POST") {
      const body = await parseJsonBody(req);
      const role = typeof body?.["role"] === "string" ? body["role"].trim() : "general";
      const task = typeof body?.["task"] === "string" ? body["task"].trim() : undefined;
      jsonResponse(res, await this.repoHub.spawnAgent(repoId, role, task), 201);
      return;
    }

    if (remainder === "verify" && method === "POST") {
      jsonResponse(res, await this.repoHub.verify(repoId));
      return;
    }

    if (remainder === "inbox" && method === "GET") {
      jsonResponse(res, await this.repoHub.listInbox(repoId));
      return;
    }

    jsonResponse(res, { error: "Not found" }, 404);
  }

  private async handleTaskCreate(req: IncomingMessage, res: ServerResponse, repoId: string): Promise<void> {
    const body = await parseJsonBody(req);
    const title = body?.["title"];
    if (typeof title !== "string" || !title.trim()) {
      jsonResponse(res, { error: "title is required" }, 400);
      return;
    }

    jsonResponse(
      res,
      this.repoHub.createTask(repoId, {
        title: title.trim(),
        ...(typeof body?.["description"] === "string" ? { description: body["description"] } : {}),
        ...(typeof body?.["priority"] === "number" ? { priority: body["priority"] } : {}),
        ...(Array.isArray(body?.["blockedBy"]) ? { blockedBy: body["blockedBy"] as string[] } : {}),
        ...(Array.isArray(body?.["acceptanceCriteria"]) ? { acceptanceCriteria: body["acceptanceCriteria"] as string[] } : {})
      }),
      201
    );
  }

  private matchRepoRoute(pathname: string): { repoId: string; remainder: string } | null {
    const match = pathname.match(/^\/api\/repos\/([^/]+)(?:\/(.*))?$/);
    if (!match) {
      return null;
    }

    return {
      repoId: decodeURIComponent(match[1] ?? ""),
      remainder: match[2] ?? ""
    };
  }
}
