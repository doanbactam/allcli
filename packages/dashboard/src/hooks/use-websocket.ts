import { useCallback, useEffect, useRef, useState } from "react";
import type { WsEvent } from "@/lib/api-client";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketOptions {
  onEvent?: (event: WsEvent) => void;
  /** Auto-reconnect interval in ms (default: 3000) */
  reconnectInterval?: number;
}

interface UseWebSocketResult {
  status: ConnectionStatus;
  lastEvent: WsEvent | null;
  send: (data: unknown) => void;
}

function buildWsUrl(): string {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${globalThis.location.host}/ws`;
}

export function useWebSocket(options?: UseWebSocketOptions): UseWebSocketResult {
  const { onEvent, reconnectInterval = 3000 } = options ?? {};
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const shouldReconnectRef = useRef(true);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (shouldReconnectRef.current) {
        setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as WsEvent;
        setLastEvent(parsed);
        onEventRef.current?.(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    setStatus("connecting");
  }, [reconnectInterval]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, lastEvent, send };
}
