import { useCallback, useEffect, useState } from "react";

export interface LiveDataState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
  refreshing: boolean;
}

interface UseLiveDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export function useLiveData<T>(
  fetcher: () => Promise<T>,
  options?: UseLiveDataOptions
): { state: LiveDataState<T>; refresh: () => Promise<void> } {
  const { enabled = true, refreshInterval = 0 } = options ?? {};
  const [state, setState] = useState<LiveDataState<T>>({
    status: "idle",
    data: null,
    error: null,
    refreshing: false,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setState((previous) => {
      if (previous.data !== null) {
        return {
          ...previous,
          error: null,
          refreshing: true,
        };
      }

      return {
        status: "loading",
        data: null,
        error: null,
        refreshing: false,
      };
    });

    try {
      const data = await fetcher();
      setState({
        status: "success",
        data,
        error: null,
        refreshing: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch";
      setState((previous) => ({
        status: previous.data === null ? "error" : "success",
        data: previous.data,
        error: message,
        refreshing: false,
      }));
    }
  }, [enabled, fetcher]);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", data: null, error: null, refreshing: false });
      return;
    }

    void refresh();
    if (refreshInterval <= 0) {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [enabled, refresh, refreshInterval]);

  return { state, refresh };
}
