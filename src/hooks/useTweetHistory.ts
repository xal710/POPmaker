import { useCallback, useEffect, useState } from "react";

import type { TweetHistoryEntry } from "../../shared/tweetHistoryParse";

const TWEET_HISTORY_URL = "/api/tweet-history";

interface TweetHistoryResponse {
  entries?: TweetHistoryEntry[];
  error?: string;
}

export function useTweetHistory() {
  const [entries, setEntries] = useState<TweetHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TWEET_HISTORY_URL}?t=${Date.now()}`);
      const json = (await response.json()) as TweetHistoryResponse;

      if (!response.ok) {
        throw new Error(json.error ?? `ツイート履歴の取得に失敗しました (${response.status})`);
      }

      setEntries(json.entries ?? []);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "ツイート履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    entries,
    loading,
    error,
    reload: load,
  };
}
