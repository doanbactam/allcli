import React from "react";
import { Box, Text } from "ink";

export interface LogViewerProps {
  lines: string[];
}

export function LogViewer({ lines }: LogViewerProps): React.JSX.Element {
  const visible = lines.slice(-20);
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text color="cyan">Output</Text>
      {visible.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
    </Box>
  );
}
