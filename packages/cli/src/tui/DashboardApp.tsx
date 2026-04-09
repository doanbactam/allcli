import React, { useEffect, useState } from "react";
import { basename } from "node:path";
import { Box, Text, useApp, useInput } from "ink";
import type { SessionRecord } from "@allcli/core";
import { TaskDecomposer } from "@allcli/orchestrator";
import type { CliContext } from "../commands/context.js";
import type { InboxMessage, Task, Worktree } from "@allcli/workspace";
import {
  canAssignTask,
  canDecomposeTask,
  canExecuteTask,
  getAllowedTaskStatuses,
  getAssignableSessions,
  nextAssignedTaskStatus,
  normalizeTaskTitle,
  normalizeWorktreeName,
} from "./dashboard-logic.js";

type DashboardTab = "sessions" | "tasks" | "worktrees" | "inbox";
type DashboardMode = "browse" | "new-task" | "assign-task" | "new-worktree" | "set-task-status";

interface DashboardSnapshot {
  sessions: SessionRecord[];
  tasks: Task[];
  worktrees: Worktree[];
  inbox: InboxMessage[];
  error?: string;
  refreshedAt: string;
}

type SelectedMap = Record<DashboardTab, number>;

const TABS: DashboardTab[] = ["sessions", "tasks", "worktrees", "inbox"];
const REFRESH_MS = 2000;
const CAN_HANDLE_INPUT = process.stdin.isTTY && typeof process.stdin.setRawMode === "function";

export interface DashboardAppProps {
  context: CliContext;
}

export function DashboardApp({ context }: DashboardAppProps): React.JSX.Element {
  const { exit } = useApp();
  const [tab, setTab] = useState<DashboardTab>("sessions");
  const [mode, setMode] = useState<DashboardMode>("browse");
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftWorktreeName, setDraftWorktreeName] = useState("");
  const [assignCandidates, setAssignCandidates] = useState<SessionRecord[]>([]);
  const [assignTargetTaskId, setAssignTargetTaskId] = useState<string | undefined>(undefined);
  const [assignSelection, setAssignSelection] = useState(0);
  const [statusCandidates, setStatusCandidates] = useState<readonly Task["status"][]>([]);
  const [statusTargetTaskId, setStatusTargetTaskId] = useState<string | undefined>(undefined);
  const [statusSelection, setStatusSelection] = useState(0);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<SelectedMap>({
    sessions: 0,
    tasks: 0,
    worktrees: 0,
    inbox: 0,
  });
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    sessions: context.manager.list(),
    tasks: context.taskTracker.list(),
    worktrees: [],
    inbox: [],
    refreshedAt: new Date().toISOString(),
  });

  useEffect(() => {
    void refreshSnapshot(context, setSnapshot, setSelected);
    const timer = setInterval(() => {
      void refreshSnapshot(context, setSnapshot, setSelected);
    }, REFRESH_MS);

    return () => clearInterval(timer);
  }, [context]);

  const status = context.manager.status();
  const summaryItems = [
    `provider ${context.providerName}`,
    `workspace ${basename(context.cwd) || context.cwd}`,
    `sessions ${status.total}`,
    `working ${status.working}`,
    `tasks ${snapshot.tasks.length}`,
    `worktrees ${snapshot.worktrees.length}`,
    `errors ${status.errored}`,
  ];

  return (
    <Box flexDirection="column" paddingX={1}>
      {CAN_HANDLE_INPUT ? (
        <DashboardInputHandler
          context={context}
          assignCandidates={assignCandidates}
          assignSelection={assignSelection}
          assignTargetTaskId={assignTargetTaskId}
          exit={exit}
          mode={mode}
          tab={tab}
          snapshot={snapshot}
          selected={selected}
          draftTaskTitle={draftTaskTitle}
          draftWorktreeName={draftWorktreeName}
          statusCandidates={statusCandidates}
          statusSelection={statusSelection}
          statusTargetTaskId={statusTargetTaskId}
          setAssignCandidates={setAssignCandidates}
          setAssignSelection={setAssignSelection}
          setAssignTargetTaskId={setAssignTargetTaskId}
          setDraftTaskTitle={setDraftTaskTitle}
          setDraftWorktreeName={setDraftWorktreeName}
          setMode={setMode}
          setMessage={setMessage}
          setSelected={setSelected}
          setStatusCandidates={setStatusCandidates}
          setStatusSelection={setStatusSelection}
          setStatusTargetTaskId={setStatusTargetTaskId}
          setTab={setTab}
          refresh={() => refreshSnapshot(context, setSnapshot, setSelected)}
        />
      ) : null}

      <Box justifyContent="space-between">
        <Text bold color="cyan">
          AllCLI Dashboard
        </Text>
        <Text color="gray">updated {formatTime(snapshot.refreshedAt)}</Text>
      </Box>

      <Box marginTop={1} borderStyle="round" paddingX={1}>
        <Text>{summaryItems.join("  |  ")}</Text>
      </Box>

      <Box marginTop={1}>
        {TABS.map((entry, index) => {
          const active = entry === tab;
          return (
            <Box key={entry} marginRight={1}>
              <Text color={active ? "green" : "gray"} inverse={active}>
                {index + 1}.{entry}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={1} minHeight={18}>
        {snapshot.error ? <Text color="red">refresh error: {snapshot.error}</Text> : null}
        {message ? <Text color="green">{message}</Text> : null}
        {mode === "new-task" ? <NewTaskPanel value={draftTaskTitle} /> : null}
        {mode === "new-worktree" ? <NewWorktreePanel value={draftWorktreeName} /> : null}
        {mode === "assign-task" ? <AssignTaskPanel task={snapshot.tasks.find((task) => task.id === assignTargetTaskId)} sessions={assignCandidates} selectedIndex={assignSelection} /> : null}
        {mode === "set-task-status" ? <TaskStatusPanel task={snapshot.tasks.find((task) => task.id === statusTargetTaskId)} statuses={statusCandidates} selectedIndex={statusSelection} /> : null}
        {mode === "browse" && tab === "sessions" ? <SessionsPanel sessions={snapshot.sessions} selectedIndex={selected.sessions} /> : null}
        {mode === "browse" && tab === "tasks" ? <TasksPanel tasks={snapshot.tasks} selectedIndex={selected.tasks} /> : null}
        {mode === "browse" && tab === "worktrees" ? <WorktreesPanel worktrees={snapshot.worktrees} selectedIndex={selected.worktrees} /> : null}
        {mode === "browse" && tab === "inbox" ? <InboxPanel inbox={snapshot.inbox} selectedIndex={selected.inbox} /> : null}
        {mode === "browse" && tab === "sessions" ? <SessionDetail session={snapshot.sessions[selected.sessions]} /> : null}
        {mode === "browse" && tab === "tasks" ? <TaskDetail task={snapshot.tasks[selected.tasks]} tasks={snapshot.tasks} /> : null}
        {mode === "browse" && tab === "worktrees" ? <WorktreeDetail worktree={snapshot.worktrees[selected.worktrees]} /> : null}
        {mode === "browse" && tab === "inbox" ? <InboxDetail message={snapshot.inbox[selected.inbox]} /> : null}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {CAN_HANDLE_INPUT
            ? mode === "new-task"
              ? "new task: type title  |  enter create  |  esc cancel  |  backspace delete"
              : mode === "new-worktree"
                ? "new worktree: type name  |  enter create  |  esc cancel  |  backspace delete"
              : mode === "assign-task"
                ? "assign task: up/down choose session  |  enter confirm  |  esc cancel"
                : mode === "set-task-status"
                  ? "task status: up/down choose status  |  enter confirm  |  esc cancel"
                  : tab === "tasks"
                    ? "keys: 1-4 tabs  |  up/down move  |  n new task  |  e execute  |  a assign  |  s status  |  d decompose  |  r refresh  |  q quit"
                    : tab === "worktrees"
                      ? "keys: 1-4 tabs  |  up/down move  |  w new worktree  |  u cleanup  |  r refresh  |  q quit"
                      : tab === "sessions"
                        ? "keys: 1-4 tabs  |  up/down move  |  x kill session  |  r refresh  |  q quit"
                        : "keys: 1-4 tabs  |  up/down move  |  r refresh  |  q quit"
            : "read-only mode: no TTY input available"}
        </Text>
      </Box>
    </Box>
  );
}

function DashboardInputHandler(
  {
    context,
    assignCandidates,
    assignSelection,
    assignTargetTaskId,
    exit,
    mode,
    tab,
    snapshot,
    selected,
    draftTaskTitle,
    draftWorktreeName,
    setAssignCandidates,
    setAssignSelection,
    setAssignTargetTaskId,
    setDraftTaskTitle,
    setDraftWorktreeName,
    setMode,
    setMessage,
    setSelected,
    setStatusCandidates,
    setStatusSelection,
    setStatusTargetTaskId,
    setTab,
    statusCandidates,
    statusSelection,
    statusTargetTaskId,
    refresh,
  }: {
    context: CliContext;
    assignCandidates: SessionRecord[];
    assignSelection: number;
    assignTargetTaskId: string | undefined;
    exit: () => void;
    mode: DashboardMode;
    tab: DashboardTab;
    snapshot: DashboardSnapshot;
    selected: SelectedMap;
    draftTaskTitle: string;
    draftWorktreeName: string;
    setAssignCandidates: React.Dispatch<React.SetStateAction<SessionRecord[]>>;
    setAssignSelection: React.Dispatch<React.SetStateAction<number>>;
    setAssignTargetTaskId: React.Dispatch<React.SetStateAction<string | undefined>>;
    setDraftTaskTitle: React.Dispatch<React.SetStateAction<string>>;
    setDraftWorktreeName: React.Dispatch<React.SetStateAction<string>>;
    setMode: React.Dispatch<React.SetStateAction<DashboardMode>>;
    setMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
    setSelected: React.Dispatch<React.SetStateAction<SelectedMap>>;
    setStatusCandidates: React.Dispatch<React.SetStateAction<readonly Task["status"][]>>;
    setStatusSelection: React.Dispatch<React.SetStateAction<number>>;
    setStatusTargetTaskId: React.Dispatch<React.SetStateAction<string | undefined>>;
    setTab: React.Dispatch<React.SetStateAction<DashboardTab>>;
    statusCandidates: readonly Task["status"][];
    statusSelection: number;
    statusTargetTaskId: string | undefined;
    refresh: () => Promise<void>;
  }
): null {
  const providerConfig = context.config.providers[context.providerName];

  useInput((input, key) => {
    if (mode === "new-task") {
      if (key.escape) {
        setDraftTaskTitle("");
        setMode("browse");
        setMessage("Cancelled new task");
        return;
      }

      if (key.return) {
        const title = normalizeTaskTitle(draftTaskTitle);
        if (!title) {
          setMessage("Task title cannot be empty");
          return;
        }

        context.taskTracker.create(title);
        setDraftTaskTitle("");
        setMode("browse");
        setMessage(`Created task: ${title}`);
        void refresh();
        return;
      }

      if (key.backspace || key.delete) {
        setDraftTaskTitle((current) => current.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setDraftTaskTitle((current) => current + input);
      }
      return;
    }

    if (mode === "new-worktree") {
      if (key.escape) {
        setDraftWorktreeName("");
        setMode("browse");
        setMessage("Cancelled new worktree");
        return;
      }

      if (key.return) {
        const name = normalizeWorktreeName(draftWorktreeName);
        if (!name) {
          setMessage("Worktree name cannot be empty");
          return;
        }

        void context.worktreeManager.create({
          name,
          isolated: context.config.workspace.isolation === "worktree"
        }).then(async (worktree) => {
          setDraftWorktreeName("");
          setMode("browse");
          setMessage(`Created worktree ${worktree.name}`);
          await refresh();
        }).catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Failed to create worktree");
        });
        return;
      }

      if (key.backspace || key.delete) {
        setDraftWorktreeName((current) => current.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setDraftWorktreeName((current) => current + input);
      }
      return;
    }

    if (mode === "assign-task") {
      if (key.escape) {
        setAssignCandidates([]);
        setAssignSelection(0);
        setAssignTargetTaskId(undefined);
        setMode("browse");
        setMessage("Cancelled task assignment");
        return;
      }

      if (key.upArrow) {
        setAssignSelection((current) => Math.max(0, current - 1));
        return;
      }

      if (key.downArrow) {
        setAssignSelection((current) => Math.min(Math.max(0, assignCandidates.length - 1), current + 1));
        return;
      }

      if (key.return) {
        const task = snapshot.tasks.find((entry) => entry.id === assignTargetTaskId);
        const assignee = assignCandidates[assignSelection];

        if (!task || !assignee) {
          setMessage("Assignment target is no longer available");
          setAssignCandidates([]);
          setAssignSelection(0);
          setAssignTargetTaskId(undefined);
          setMode("browse");
          void refresh();
          return;
        }

        context.taskTracker.update(task.id, {
          assignedAgent: assignee.id,
          status: nextAssignedTaskStatus(task),
        });
        setAssignCandidates([]);
        setAssignSelection(0);
        setAssignTargetTaskId(undefined);
        setMode("browse");
        setMessage(`Assigned ${task.id.slice(0, 8)} to ${assignee.id.slice(0, 8)}`);
        void refresh();
      }
      return;
    }

    if (mode === "set-task-status") {
      if (key.escape) {
        setStatusCandidates([]);
        setStatusSelection(0);
        setStatusTargetTaskId(undefined);
        setMode("browse");
        setMessage("Cancelled status change");
        return;
      }

      if (key.upArrow) {
        setStatusSelection((current) => Math.max(0, current - 1));
        return;
      }

      if (key.downArrow) {
        setStatusSelection((current) => Math.min(Math.max(0, statusCandidates.length - 1), current + 1));
        return;
      }

      if (key.return) {
        const task = snapshot.tasks.find((entry) => entry.id === statusTargetTaskId);
        const nextStatus = statusCandidates[statusSelection];
        if (!task || !nextStatus) {
          setStatusCandidates([]);
          setStatusSelection(0);
          setStatusTargetTaskId(undefined);
          setMode("browse");
          setMessage("Status target is no longer available");
          void refresh();
          return;
        }

        context.taskTracker.update(task.id, { status: nextStatus });
        setStatusCandidates([]);
        setStatusSelection(0);
        setStatusTargetTaskId(undefined);
        setMode("browse");
        setMessage(`Set ${task.id.slice(0, 8)} to ${nextStatus}`);
        void refresh();
      }
      return;
    }

    if (input === "q" || key.escape) {
      exit();
      return;
    }

    if (input === "r") {
      void refresh();
      return;
    }

    if (input === "1") {
      setTab("sessions");
      return;
    }

    if (input === "2") {
      setTab("tasks");
      return;
    }

    if (input === "3") {
      setTab("worktrees");
      return;
    }

    if (input === "4") {
      setTab("inbox");
      return;
    }

    if (key.upArrow) {
      setSelected((current) => ({
        ...current,
        [tab]: Math.max(0, current[tab] - 1),
      }));
      return;
    }

    if (key.downArrow) {
      const nextMax = Math.max(0, getTabLength(tab, snapshot) - 1);
      setSelected((current) => ({
        ...current,
        [tab]: Math.min(nextMax, current[tab] + 1),
      }));
      return;
    }

    if (key.leftArrow) {
      setTab((current) => TABS[(TABS.indexOf(current) + TABS.length - 1) % TABS.length] as DashboardTab);
      return;
    }

    if (key.rightArrow) {
      setTab((current) => TABS[(TABS.indexOf(current) + 1) % TABS.length] as DashboardTab);
      return;
    }

    if (input === "n" && tab === "tasks") {
      setDraftTaskTitle("");
      setMode("new-task");
      setMessage("Enter a task title");
      return;
    }

    if (input === "s" && tab === "tasks") {
      const task = snapshot.tasks[selected.tasks];
      if (!task) {
        setMessage("No task selected");
        return;
      }

      setStatusCandidates(getAllowedTaskStatuses(task));
      setStatusSelection(0);
      setStatusTargetTaskId(task.id);
      setMode("set-task-status");
      setMessage(`Choose next status for ${task.id.slice(0, 8)}`);
      return;
    }

    if (input === "a" && tab === "tasks") {
      const task = snapshot.tasks[selected.tasks];
      if (!task) {
        setMessage("No task selected");
        return;
      }

      const eligibility = canAssignTask(task);
      if (!eligibility.ok) {
        setMessage(eligibility.reason);
        return;
      }

      const candidates = getAssignableSessions(snapshot.sessions);
      if (candidates.length === 0) {
        setMessage("No assignable session available");
        return;
      }

      setAssignCandidates(candidates);
      setAssignSelection(0);
      setAssignTargetTaskId(task.id);
      setMode("assign-task");
      setMessage(`Choose assignee for ${task.id.slice(0, 8)}`);
      return;
    }

    if (input === "e" && tab === "tasks") {
      const task = snapshot.tasks[selected.tasks];
      if (!task) {
        setMessage("No task selected");
        return;
      }

      const execution = canExecuteTask(task);
      if (!execution.ok) {
        setMessage(execution.reason);
        return;
      }

      void context.manager.run(task.title, {
        cwd: context.cwd,
        dangerous: providerConfig.dangerous,
        outputFormat: providerConfig.outputFormat,
        model: providerConfig.model
      }).then(async (session) => {
        context.taskTracker.update(task.id, {
          assignedAgent: session.id,
          status: "in_progress"
        });
        setMessage(`Started ${task.id.slice(0, 8)} on ${session.id.slice(0, 8)}`);
        await refresh();
      }).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Failed to execute task");
      });
      return;
    }

    if (input === "d" && tab === "tasks") {
      const task = snapshot.tasks[selected.tasks];
      if (!task) {
        setMessage("No task selected");
        return;
      }

      const decomposition = canDecomposeTask(task, snapshot.tasks);
      if (!decomposition.ok) {
        setMessage(decomposition.reason);
        return;
      }

      const decomposer = new TaskDecomposer();
      const result = decomposer.decompose(task.title, task.description);
      context.taskTracker.decompose(
        task.id,
        result.subtasks.map((item) => ({
          title: item.title,
          description: item.description,
          priority: item.priority,
        }))
      );
      setMessage(`Decomposed ${task.id.slice(0, 8)} into ${result.subtasks.length} subtasks`);
      void refresh();
      return;
    }

    if (input === "w" && tab === "worktrees") {
      setDraftWorktreeName("");
      setMode("new-worktree");
      setMessage("Enter a worktree name");
      return;
    }

    if (input === "u" && tab === "worktrees") {
      void context.worktreeManager.cleanup().then(async (result) => {
        setMessage(result.removed.length > 0 ? `Removed ${result.removed.length} worktree(s)` : "No merged/stale worktrees to clean up");
        await refresh();
      }).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Failed to clean up worktrees");
      });
      return;
    }

    if (input === "x" && tab === "sessions") {
      const session = snapshot.sessions[selected.sessions];
      if (!session) {
        setMessage("No session selected");
        return;
      }

      void context.manager.kill(session.id)
        .then(async () => {
          setMessage(`Killed session ${session.id.slice(0, 8)}`);
          await refresh();
        })
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Failed to kill session");
        });
    }
  });

  return null;
}

async function refreshSnapshot(
  context: CliContext,
  setSnapshot: React.Dispatch<React.SetStateAction<DashboardSnapshot>>,
  setSelected: React.Dispatch<React.SetStateAction<SelectedMap>>
): Promise<void> {
  try {
    const [worktrees, inbox] = await Promise.all([
      context.worktreeManager.list(),
      context.inbox.peek("*"),
    ]);

    const nextSnapshot: DashboardSnapshot = {
      sessions: context.manager.list().slice().reverse(),
      tasks: context.taskTracker.list().slice().sort((a, b) => b.priority - a.priority),
      worktrees,
      inbox: inbox.slice().reverse(),
      refreshedAt: new Date().toISOString(),
    };

    setSnapshot(nextSnapshot);
    setSelected((current) => clampSelected(current, nextSnapshot));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh failure";
    setSnapshot((current) => ({
      ...current,
      error: message,
      refreshedAt: new Date().toISOString(),
    }));
  }
}

function SessionsPanel({ sessions, selectedIndex }: { sessions: SessionRecord[]; selectedIndex: number }): React.JSX.Element {
  if (sessions.length === 0) {
    return <Text color="gray">No sessions recorded.</Text>;
  }

  return (
    <Box flexDirection="column">
      {sessions.slice(0, 10).map((session, index) => (
        <Text key={session.id} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {pad(session.id.slice(0, 8), 10)}
          {pad(session.status, 16)}
          {pad(session.provider, 10)}
          {truncate(session.task, 70)}
        </Text>
      ))}
    </Box>
  );
}

function TasksPanel({ tasks, selectedIndex }: { tasks: Task[]; selectedIndex: number }): React.JSX.Element {
  if (tasks.length === 0) {
    return <Text color="gray">No tasks created.</Text>;
  }

  return (
    <Box flexDirection="column">
      {tasks.slice(0, 10).map((task, index) => (
        <Text key={task.id} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {pad(task.status, 14)}
          p{String(task.priority).padEnd(3, " ")}
          {pad(task.id.slice(0, 8), 10)}
          {truncate(task.title, 48)}
          {task.assignedAgent ? `  -> ${task.assignedAgent.slice(0, 8)}` : ""}
        </Text>
      ))}
    </Box>
  );
}

function WorktreesPanel({ worktrees, selectedIndex }: { worktrees: Worktree[]; selectedIndex: number }): React.JSX.Element {
  if (worktrees.length === 0) {
    return <Text color="gray">No worktrees found.</Text>;
  }

  return (
    <Box flexDirection="column">
      {worktrees.slice(0, 10).map((worktree, index) => (
        <Text key={worktree.id} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {pad(worktree.status, 10)}
          {pad(worktree.branch, 28)}
          {truncate(worktree.path, 54)}
        </Text>
      ))}
    </Box>
  );
}

function InboxPanel({ inbox, selectedIndex }: { inbox: InboxMessage[]; selectedIndex: number }): React.JSX.Element {
  if (inbox.length === 0) {
    return <Text color="gray">Inbox is empty.</Text>;
  }

  return (
    <Box flexDirection="column">
      {inbox.slice(0, 10).map((message, index) => (
        <Text key={message.id} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {pad(`${message.from}->${message.to}`, 28)}
          {truncate(message.body, 68)}
        </Text>
      ))}
    </Box>
  );
}

function NewTaskPanel({ value }: { value: string }): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color="cyan">Create Task</Text>
      <Text>Title: {value || "_"}</Text>
    </Box>
  );
}

function NewWorktreePanel({ value }: { value: string }): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color="cyan">Create Worktree</Text>
      <Text>Name: {value || "_"}</Text>
    </Box>
  );
}

function AssignTaskPanel(
  {
    task,
    sessions,
    selectedIndex,
  }: {
    task: Task | undefined;
    sessions: SessionRecord[];
    selectedIndex: number;
  }
): React.JSX.Element {
  if (!task) {
    return <Text color="gray">Task no longer exists.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">Assign Task</Text>
      <Text>{truncate(task.title, 72)}</Text>
      {sessions.map((session, index) => (
        <Text key={session.id} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {pad(session.id.slice(0, 8), 10)}
          {pad(session.status, 16)}
          {truncate(session.task, 58)}
        </Text>
      ))}
    </Box>
  );
}

function TaskStatusPanel(
  {
    task,
    statuses,
    selectedIndex,
  }: {
    task: Task | undefined;
    statuses: readonly Task["status"][];
    selectedIndex: number;
  }
): React.JSX.Element {
  if (!task) {
    return <Text color="gray">Task no longer exists.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">Set Task Status</Text>
      <Text>{truncate(task.title, 72)}</Text>
      {statuses.map((status, index) => (
        <Text key={status} inverse={index === selectedIndex}>
          {prefixSelected(index, selectedIndex)}
          {status}
        </Text>
      ))}
    </Box>
  );
}

function SessionDetail({ session }: { session: SessionRecord | undefined }): React.JSX.Element {
  if (!session) {
    return <Text color="gray">No session selected.</Text>;
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="cyan">Session Detail</Text>
      <Text>id: {session.id.slice(0, 8)}</Text>
      <Text>status: {session.status}</Text>
      <Text>provider: {session.provider}</Text>
      <Text>pid: {session.pid ?? "n/a"}</Text>
      <Text>updated: {formatDateTime(session.updatedAt)}</Text>
      <Text>task: {truncate(session.task, 72)}</Text>
      {session.error ? <Text color="red">error: {truncate(session.error, 72)}</Text> : null}
    </Box>
  );
}

function TaskDetail({ task, tasks }: { task: Task | undefined; tasks: Task[] }): React.JSX.Element {
  if (!task) {
    return <Text color="gray">No task selected.</Text>;
  }

  const children = tasks.filter((entry) => entry.blockedBy.includes(task.id));
  const dependencies = task.blockedBy.map((id) => id.slice(0, 8)).join(", ") || "none";

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="cyan">Task Detail</Text>
      <Text>id: {task.id.slice(0, 8)}</Text>
      <Text>status: {task.status}</Text>
      <Text>priority: {task.priority}</Text>
      <Text>assigned: {task.assignedAgent?.slice(0, 8) ?? "none"}</Text>
      <Text>depends on: {dependencies}</Text>
      <Text>children: {children.map((entry) => entry.id.slice(0, 8)).join(", ") || "none"}</Text>
      <Text>title: {truncate(task.title, 72)}</Text>
      {task.description ? <Text>desc: {truncate(task.description, 72)}</Text> : null}
    </Box>
  );
}

function WorktreeDetail({ worktree }: { worktree: Worktree | undefined }): React.JSX.Element {
  if (!worktree) {
    return <Text color="gray">No worktree selected.</Text>;
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="cyan">Worktree Detail</Text>
      <Text>id: {worktree.id.slice(0, 8)}</Text>
      <Text>name: {worktree.name}</Text>
      <Text>status: {worktree.status}</Text>
      <Text>branch: {worktree.branch}</Text>
      <Text>path: {truncate(worktree.path, 72)}</Text>
    </Box>
  );
}

function InboxDetail({ message }: { message: InboxMessage | undefined }): React.JSX.Element {
  if (!message) {
    return <Text color="gray">No inbox message selected.</Text>;
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="cyan">Inbox Detail</Text>
      <Text>from: {message.from}</Text>
      <Text>to: {message.to}</Text>
      <Text>read: {String(message.read)}</Text>
      <Text>body: {truncate(message.body, 72)}</Text>
    </Box>
  );
}

function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 3))}...`;
}

function pad(value: string, length: number): string {
  if (value.length >= length) {
    return `${value.slice(0, Math.max(0, length - 1))} `;
  }

  return value.padEnd(length, " ");
}

function prefixSelected(index: number, selectedIndex: number): string {
  return index === selectedIndex ? "> " : "  ";
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getTabLength(tab: DashboardTab, snapshot: DashboardSnapshot): number {
  switch (tab) {
    case "sessions":
      return snapshot.sessions.length;
    case "tasks":
      return snapshot.tasks.length;
    case "worktrees":
      return snapshot.worktrees.length;
    case "inbox":
      return snapshot.inbox.length;
  }
}

function clampSelected(current: SelectedMap, snapshot: DashboardSnapshot): SelectedMap {
  return {
    sessions: clampIndex(current.sessions, snapshot.sessions.length),
    tasks: clampIndex(current.tasks, snapshot.tasks.length),
    worktrees: clampIndex(current.worktrees, snapshot.worktrees.length),
    inbox: clampIndex(current.inbox, snapshot.inbox.length),
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, length - 1));
}
