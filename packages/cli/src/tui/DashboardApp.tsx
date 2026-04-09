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
  getAssignableSessions,
  nextAssignedTaskStatus,
  normalizeTaskTitle,
} from "./dashboard-logic.js";

type DashboardTab = "sessions" | "tasks" | "worktrees" | "inbox";
type DashboardMode = "browse" | "new-task" | "assign-task";

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
  const [assignCandidates, setAssignCandidates] = useState<SessionRecord[]>([]);
  const [assignTargetTaskId, setAssignTargetTaskId] = useState<string | undefined>(undefined);
  const [assignSelection, setAssignSelection] = useState(0);
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
    `done ${status.done}`,
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
          setAssignCandidates={setAssignCandidates}
          setAssignSelection={setAssignSelection}
          setAssignTargetTaskId={setAssignTargetTaskId}
          setDraftTaskTitle={setDraftTaskTitle}
          setMode={setMode}
          setMessage={setMessage}
          setSelected={setSelected}
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
        {mode === "assign-task" ? <AssignTaskPanel task={snapshot.tasks.find((task) => task.id === assignTargetTaskId)} sessions={assignCandidates} selectedIndex={assignSelection} /> : null}
        {mode === "browse" && tab === "sessions" ? <SessionsPanel sessions={snapshot.sessions} selectedIndex={selected.sessions} /> : null}
        {mode === "browse" && tab === "tasks" ? <TasksPanel tasks={snapshot.tasks} selectedIndex={selected.tasks} /> : null}
        {mode === "browse" && tab === "worktrees" ? <WorktreesPanel worktrees={snapshot.worktrees} selectedIndex={selected.worktrees} /> : null}
        {mode === "browse" && tab === "inbox" ? <InboxPanel inbox={snapshot.inbox} selectedIndex={selected.inbox} /> : null}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {CAN_HANDLE_INPUT
            ? mode === "new-task"
              ? "new task: type title  |  enter create  |  esc cancel  |  backspace delete"
              : mode === "assign-task"
                ? "assign task: up/down choose session  |  enter confirm  |  esc cancel"
              : "keys: 1-4 tabs  |  up/down move  |  n new task  |  a assign task  |  d decompose  |  x kill session  |  r refresh  |  q quit"
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
    setAssignCandidates,
    setAssignSelection,
    setAssignTargetTaskId,
    setDraftTaskTitle,
    setMode,
    setMessage,
    setSelected,
    setTab,
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
    setAssignCandidates: React.Dispatch<React.SetStateAction<SessionRecord[]>>;
    setAssignSelection: React.Dispatch<React.SetStateAction<number>>;
    setAssignTargetTaskId: React.Dispatch<React.SetStateAction<string | undefined>>;
    setDraftTaskTitle: React.Dispatch<React.SetStateAction<string>>;
    setMode: React.Dispatch<React.SetStateAction<DashboardMode>>;
    setMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
    setSelected: React.Dispatch<React.SetStateAction<SelectedMap>>;
    setTab: React.Dispatch<React.SetStateAction<DashboardTab>>;
    refresh: () => Promise<void>;
  }
): null {
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
