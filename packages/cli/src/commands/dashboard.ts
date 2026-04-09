import React from "react";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "ink";
import { ApiServer } from "../api-server.js";
import { createCliContext } from "./context.js";
import { DashboardApp } from "../tui/DashboardApp.js";

const DEFAULT_PORT = 3000;

// Resolve dashboard dist relative to THIS package (not cwd),
// so it works when allcli is run from any project directory.
const cliDir = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIST = resolve(cliDir, "../../../dashboard/dist");

export async function startDashboard(
  cwd: string,
  options?: { port?: number; dev?: boolean; web?: boolean }
): Promise<void> {
  if (!options?.web && !options?.dev) {
    const context = createCliContext(cwd);
    render(React.createElement(DashboardApp, { context }));
    return;
  }

  const port = options?.port ?? DEFAULT_PORT;
  const dev = options?.dev ?? false;
  const context = createCliContext(cwd);

  let dashboardDistDir: string | undefined;
  if (!dev && existsSync(DASHBOARD_DIST)) {
    dashboardDistDir = DASHBOARD_DIST;
  }

  const apiServer = new ApiServer(context, port, dashboardDistDir);
  await apiServer.start();

  if (dev) {
    const dashboardDir = resolve(cliDir, "../../dashboard");
    const viteArgs = ["run", "dev"];
    process.stdout.write(`  Vite dev:   starting...\n`);

    const child = spawn("pnpm", viteArgs, {
      cwd: dashboardDir,
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (err) => {
      process.stderr.write(`Vite dev server error: ${err.message}\n`);
    });

    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        process.stderr.write(`Vite exited with code ${code}\n`);
      }
      void apiServer.stop().then(() => process.exit(code ?? 0));
    });
  }

  // Graceful shutdown
  const shutdown = (): void => {
    process.stdout.write("\nShutting down...\n");
    void apiServer.stop().then(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
