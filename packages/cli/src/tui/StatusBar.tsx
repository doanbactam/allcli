import React from "react";
import { Box, Text } from "ink";

export interface StatusBarProps {
  provider: string;
  model: string;
  status: string;
  sessionId?: string;
}

export function StatusBar({ provider, model, status, sessionId }: StatusBarProps): React.JSX.Element {
  return (
    <Box>
      <Text>
        provider=<Text color="green">{provider}</Text> model=<Text color="green">{model}</Text> status=
        <Text color="yellow">{status}</Text>
        {sessionId ? ` session=${sessionId}` : ""}
      </Text>
    </Box>
  );
}
