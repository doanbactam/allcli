import React, { useEffect, useMemo, useState } from "react";
import { render, Box, Text, useApp } from "ink";
import type { SessionStatus } from "@allcli/core";
import { createCliContext } from "./context.js";
import { StatusBar } from "../tui/StatusBar.js";
import { LogViewer } from "../tui/LogViewer.js";

interface RunStreamAppProps {
  task: string;
  cwd: string;
  providerOverride?: string | undefined;
  skillName?: string | undefined;
}

function RunStreamApp({ task, cwd, providerOverride, skillName }: RunStreamAppProps): React.JSX.Element {
  const { exit } = useApp();
  const context = useMemo(() => createCliContext(cwd, providerOverride), [cwd, providerOverride]);
  const providerConfig = context.config.providers[context.providerName];
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<SessionStatus>("spawning");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const effectiveTask = skillName ? `${task}\n\n[Skill: ${skillName}]` : task;

  useEffect(() => {
    const onOutput = ({ chunk }: { sessionId: string; chunk: string }): void => {
      const normalized = chunk
        .split(/\r?\n/)
        .map((line: string) => line.trimEnd())
        .filter((line: string) => line.length > 0);
      setLines((previous) => [...previous, ...normalized]);
    };

    const onTransition = ({ to, sessionId: id }: { sessionId: string; from: SessionStatus; to: SessionStatus }): void => {
      setStatus(to);
      setSessionId(id);
      if (to === "done" || to === "errored" || to === "killed") {
        setTimeout(() => exit(), 20);
      }
    };

    context.manager.events.on("session.output", onOutput);
    context.manager.events.on("session.transition", onTransition);

    void context.manager.run(effectiveTask, {
      command: providerConfig.command,
      cwd,
      model: providerConfig.model,
      dangerous: providerConfig.dangerous,
      outputFormat: providerConfig.outputFormat
    });

    return () => {
      context.manager.events.off("session.output", onOutput);
      context.manager.events.off("session.transition", onTransition);
    };
  }, [context.manager, context.providerName, cwd, effectiveTask, exit, providerConfig]);

  const statusBar = sessionId
    ? <StatusBar provider={context.providerName} model={providerConfig.model} status={status} sessionId={sessionId} />
    : <StatusBar provider={context.providerName} model={providerConfig.model} status={status} />;

  return (
    <Box flexDirection="column" gap={1}>
      {statusBar}
      <LogViewer lines={lines} />
      {(status === "done" || status === "errored" || status === "killed") && <Text>Status: {status}</Text>}
    </Box>
  );
}

export function runCommand(task: string, cwd: string, opts: { provider?: string; skill?: string } = {}): void {
  const props: RunStreamAppProps = { task, cwd };
  if (opts.provider !== undefined) {
    props.providerOverride = opts.provider;
  }
  if (opts.skill !== undefined) {
    props.skillName = opts.skill;
  }
  render(<RunStreamApp {...props} />);
}
