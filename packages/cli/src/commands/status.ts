import { createCliContext } from "./context.js";

export function statusCommand(cwd: string): void {
  const context = createCliContext(cwd);
  const summary = context.manager.status();
  const config = context.config;

  process.stdout.write(
    [
      `provider=${config.providers.default}`,
      `total=${summary.total}`,
      `working=${summary.working}`,
      `done=${summary.done}`,
      `errored=${summary.errored}`,
      `killed=${summary.killed}`
    ].join("  ") + "\n"
  );

  const sessions = context.manager.list();
  const lastSession = sessions[sessions.length - 1];
  if (lastSession) {
    const truncatedTask = lastSession.task.length > 50 ? `${lastSession.task.slice(0, 47)}...` : lastSession.task;
    process.stdout.write(
      `last: ${lastSession.id.slice(0, 8)}  ${lastSession.status}  ${truncatedTask}\n`
    );
  }
}
