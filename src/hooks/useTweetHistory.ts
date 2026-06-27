import { useCallback, useEffect, useState } from "react";

import { MOCK_TWEET_HISTORY } from "../data/mockTweetHistory";
import {
  annotateDailyPostOrder,
  parseBuyInfoTweets,
  type TweetHistoryEntry,
} from "../../shared/tweetHistoryParse";

const TWEET_HISTORY_URL = "/api/tweet-history";

export type TweetHistorySource = "live" | "mock";

interface TweetHistoryResponse {
  source?: TweetHistorySource;
  entries?: TweetHistoryEntry[];
  error?: string;
}

export function useTweetHistory() {
  const [entries, setEntries] = useState<TweetHistoryEntry[]>([]);
  const [source, setSource] = useState<TweetHistorySource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMock = useCallback(() => {
    const timeline = MOCK_TWEET_HISTORY.map((tweet) => ({
      id: tweet.id,
      postedAt: tweet.postedAt,
    }));
    const mockEntries = annotateDailyPostOrder(parseBuyInfoTweets(MOCK_TWEET_HISTORY), timeline);
    setEntries(mockEntries);
    setSource("mock");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TWEET_HISTORY_URL}?t=${Date.now()}`);

      if (response.status === 404) {
        loadMock();
        return;
      }

      const json = (await response.json()) as TweetHistoryResponse;

      if (!response.ok) {
        throw new Error(json.error ?? `ツイート履歴の取得に失敗しました (${response.status})`);
      }

      if (json.source === "live" && json.entries) {
        setEntries(json.entries);
        setSource("live");
        return;
      }

      loadMock();
    } catch (err) {
      loadMock();
      setError(err instanceof Error ? err.message : "ツイート履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [loadMock]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    entries,
    source,
    loading,
    error,
    reload: load,
  };
}
