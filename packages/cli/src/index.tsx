#!/usr/bin/env node
import { Command, Option } from "commander";
import { listAgents, killAgent, cleanAgents, spawnAgent } from "./commands/agent.js";
import { runCommand } from "./commands/run.js";
import { statusCommand } from "./commands/status.js";
import { listSkills } from "./commands/skill.js";
import { verificationCheck } from "./commands/verification.js";
import { createWorkspace, listWorkspaces, cleanupWorkspaces } from "./commands/workspace.js";
import { createTask, listTasks, decomposeTask, taskStatus } from "./commands/task.js";
import { runLoop } from "./commands/loop.js";
import { startDashboard } from "./commands/dashboard.js";

const program = new Command();

program.name("allcli").description("AllCLI — Unified AI development automation").version("0.3.0");

program
  .command("run")
  .description("Run a task through a provider")
  .argument("<task>", "Task description")
  .option("-p, --provider <provider>", "Provider to use (claude, opencode, codex)")
  .option("-s, --skill <skill>", "Skill to load for this task")
  .action((task: string, opts: { provider?: string; skill?: string }) => {
    runCommand(task, process.cwd(), opts);
  });

const agent = program.command("agent").description("Agent session commands");

agent
  .command("list")
  .description("List sessions")
  .action(() => {
    listAgents(process.cwd());
  });

agent
  .command("kill")
  .description("Kill a working session")
  .argument("<id>", "Session id")
  .action(async (id: string) => {
    await killAgent(id, process.cwd());
  });

agent
  .command("clean")
  .description("Remove stale (non-working) sessions")
  .action(() => {
    cleanAgents(process.cwd());
  });

agent
  .command("spawn")
  .description("Spawn an agent with a specific role")
  .argument("<role>", "Agent role (planner, builder, reviewer, tester)")
  .option("-t, --task <task>", "Task description for the agent")
  .action(async (role: string, opts: { task?: string }) => {
    await spawnAgent(role, process.cwd(), opts);
  });

const workspace = program.command("workspace").description("Workspace management");

workspace
  .command("create")
  .description("Create an isolated git worktree")
  .argument("<name>", "Worktree name")
  .action(async (name: string) => {
    await createWorkspace(name, process.cwd());
  });

workspace
  .command("list")
  .description("List worktrees")
  .action(async () => {
    await listWorkspaces(process.cwd());
  });

workspace
  .command("cleanup")
  .description("Cleanup merged/stale worktrees")
  .option("--dry-run", "Preview without removing")
  .action(async (opts: { dryRun?: boolean }) => {
    await cleanupWorkspaces(process.cwd(), opts.dryRun);
  });

const task = program.command("task").description("Task management");

task
  .command("create")
  .description("Create a new task")
  .argument("<description>", "Task description")
  .option("-p, --priority <number>", "Priority (higher = more important)", "0")
  .option("-b, --blocked-by <ids...>", "Task IDs this depends on")
  .action((description: string, opts: { priority?: string; blockedBy?: string[] }) => {
    const priority = opts.priority ? parseInt(opts.priority, 10) : undefined;
    createTask(description, process.cwd(), {
      ...(priority !== undefined ? { priority } : {}),
      ...(opts.blockedBy ? { blockedBy: opts.blockedBy } : {})
    });
  });

task
  .command("list")
  .description("List tasks")
  .option("-s, --status <status>", "Filter by status")
  .action((opts: { status?: string }) => {
    listTasks(process.cwd(), opts.status);
  });

task
  .command("decompose")
  .description("Auto-decompose a task into subtasks")
  .argument("<taskId>", "Task ID to decompose")
  .action((taskId: string) => {
    decomposeTask(taskId, process.cwd());
  });

task
  .command("status")
  .description("Show detailed task status")
  .argument("<taskId>", "Task ID")
  .action((taskId: string) => {
    taskStatus(taskId, process.cwd());
  });

const skill = program.command("skill").description("Skill management");

skill
  .command("list")
  .description("List available skills")
  .action(() => {
    listSkills(process.cwd());
  });

program
  .command("loop")
  .description("Ralph Loop: autonomous iteration until complete")
  .option("--prd <path>", "Path to PRD JSON file")
  .option("-n, --max-iterations <number>", "Maximum iterations", "50")
  .action(async (opts: { prd?: string; maxIterations?: string }) => {
    const maxIterations = opts.maxIterations ? parseInt(opts.maxIterations, 10) : undefined;
    await runLoop(process.cwd(), {
      ...(opts.prd ? { prdPath: opts.prd } : {}),
      ...(maxIterations !== undefined ? { maxIterations } : {})
    });
  });

program
  .command("status")
  .description("Show system status")
  .action(() => {
    statusCommand(process.cwd());
  });

program
  .command("verify")
  .description("Run quality gates (typecheck, lint, test, build)")
  .action(async () => {
    await verificationCheck(process.cwd());
  });

program
  .command("dashboard")
  .description("Start the web dashboard with API server")
  .option("-p, --port <number>", "API server port", "3000")
  .option("--dev", "Start Vite dev server alongside API (for development)")
  .action(async (opts: { port?: string; dev?: boolean }) => {
    await startDashboard(process.cwd(), {
      ...(opts.port ? { port: parseInt(opts.port, 10) } : {}),
      ...(opts.dev ? { dev: true } : {}),
    });
  });

program.parse();
