import { useCallback, useEffect, useRef, useState } from "react";
import type { ComparisonData } from "../types";

const DATA_URL = "/api/comparison";
const REFRESH_URL = "/api/comparison/refresh";
const STATUS_URL = "/api/comparison/status";
const AUTO_REFRESH_MS = 60 * 60 * 1000;
const POLL_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface RefreshProgress {
  status: "idle" | "running" | "done" | "error";
  message: string;
  error?: string | null;
}

export function useComparisonData() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadCachedData = useCallback(async () => {
    setError(null);
    setWarning(null);

    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      const json = (await response.json()) as ComparisonData & { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? `データの取得に失敗しました (${response.status})`);
      }

      setData(json);
      setWarning(json.warning ?? null);
      setLastFetchedAt(new Date());
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      return null;
    }
  }, []);

  const pollRefreshStatus = useCallback(async () => {
    const response = await fetch(`${STATUS_URL}?t=${Date.now()}`);
    if (!response.ok) return null;
    return (await response.json()) as RefreshProgress;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setProgressMessage("更新を開始しています...");

    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      const status = await pollRefreshStatus();
      if (status?.message) {
        setProgressMessage(status.message);
      }
    }, POLL_MS);

    try {
      const response = await fetch(REFRESH_URL, { method: "POST" });
      const json = (await response.json().catch(() => ({}))) as ComparisonData & {
        error?: string;
        progress?: RefreshProgress;
      };

      if (response.status === 202) {
        while (true) {
          await sleep(POLL_MS);
          const status = await pollRefreshStatus();
          if (status?.message) {
            setProgressMessage(status.message);
          }
          if (status?.status === "done") {
            break;
          }
          if (status?.status === "error") {
            throw new Error(status.error ?? status.message ?? "更新に失敗しました");
          }
        }

        await loadCachedData();
        setProgressMessage("更新完了");
        return;
      }

      if (!response.ok) {
        throw new Error(json.error ?? json.progress?.message ?? "更新に失敗しました");
      }

      setData(json);
      setWarning(json.warning ?? null);
      setLastFetchedAt(new Date());
      setProgressMessage(json.progress?.message ?? "更新完了");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setRefreshing(false);
      window.setTimeout(() => setProgressMessage(null), 3000);
    }
  }, [loadCachedData, pollRefreshStatus]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadCachedData();
      setLoading(false);
    })();

    intervalRef.current = window.setInterval(() => {
      void refresh();
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, [loadCachedData, refresh]);

  return {
    data,
    loading,
    refreshing,
    error,
    warning,
    progressMessage,
    lastFetchedAt,
    refresh,
  };
}
