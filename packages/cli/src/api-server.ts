import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import type { CliContext } from "./commands/context.js";
import type { EventMap } from "@allcli/core";

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

  constructor(
    private readonly context: CliContext,
    private readonly port: number,
    private readonly dashboardDistDir?: string
  ) {
    this.server = createServer((req, res) => this.handleRequest(req, res));
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.on("close", () => this.clients.delete(ws));
    });

    this.subscribeToEvents();
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
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get address(): string {
    return `http://localhost:${this.port}`;
  }

  private subscribeToEvents(): void {
    const bus = this.context.manager.events;

    bus.on("session.transition", (payload: EventMap["session.transition"]) => {
      this.broadcast({ type: "session.transition", payload });
    });

    bus.on("session.updated", (payload: EventMap["session.updated"]) => {
      this.broadcast({ type: "session.updated", payload });
    });

    bus.on("session.output", (payload: EventMap["session.output"]) => {
      this.broadcast({ type: "session.output", payload });
    });
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
        await this.handleApiRoute(req, res, pathname);
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
    pathname: string
  ): Promise<void> {
    const method = req.method ?? "GET";

    // GET /api/status
    if (pathname === "/api/status" && method === "GET") {
      const status = this.context.manager.status();
      const config = this.context.config;
      jsonResponse(res, {
        status,
        provider: this.context.providerName,
        workspace: config.workspace,
        orchestrator: config.orchestrator,
      });
      return;
    }

    // GET /api/sessions
    if (pathname === "/api/sessions" && method === "GET") {
      const sessions = this.context.manager.list();
      jsonResponse(res, sessions);
      return;
    }

    // GET /api/tasks
    if (pathname === "/api/tasks" && method === "GET") {
      const tasks = this.context.taskTracker.list();
      jsonResponse(res, tasks);
      return;
    }

    // POST /api/tasks
    if (pathname === "/api/tasks" && method === "POST") {
      const body = await parseJsonBody(req);
      const title = body?.["title"];
      if (typeof title !== "string" || !title.trim()) {
        jsonResponse(res, { error: "title is required" }, 400);
        return;
      }
      const task = this.context.taskTracker.create(title, {
        ...(typeof body?.["description"] === "string" ? { description: body["description"] } : {}),
        ...(typeof body?.["priority"] === "number" ? { priority: body["priority"] } : {}),
        ...(Array.isArray(body?.["blockedBy"]) ? { blockedBy: body["blockedBy"] as string[] } : {}),
        ...(Array.isArray(body?.["acceptanceCriteria"]) ? { acceptanceCriteria: body["acceptanceCriteria"] as string[] } : {}),
      });
      jsonResponse(res, task, 201);
      return;
    }

    // GET /api/worktrees
    if (pathname === "/api/worktrees" && method === "GET") {
      const worktrees = await this.context.worktreeManager.list();
      jsonResponse(res, worktrees);
      return;
    }

    // GET /api/inbox
    if (pathname === "/api/inbox" && method === "GET") {
      const allMessages = await this.context.inbox.peek("*");
      jsonResponse(res, allMessages);
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
}
