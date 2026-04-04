import { useCallback, useEffect, useState } from "react";

type FetchState<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

/**
 * Generic data-fetching hook with auto-refresh.
 * Returns current state and a manual refresh function.
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  options?: { refreshInterval?: number }
): { state: FetchState<T>; refresh: () => void } {
  const { refreshInterval = 5_000 } = options ?? {};
  const [state, setState] = useState<FetchState<T>>({ status: "idle", data: null, error: null });

  const refresh = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    fetcher()
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to fetch";
        setState({ status: "error", data: null, error: message });
      });
  }, [fetcher]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, refreshInterval);
    return () => clearInterval(timer);
  }, [refresh, refreshInterval]);

  return { state, refresh };
}
