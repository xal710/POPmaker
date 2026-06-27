import { HARERUYA_ANNEX_SCREEN_NAME } from "./tweetHistoryParse";

export const TWEET_HISTORY_SCREEN_BY_USERNAME: Record<string, string> = {
  "20260605": "hareruya2koriym",
  "k.ishigaki": "hareruya2tkdbb",
};

export function resolveTweetHistoryScreenName(username: string | null | undefined): string {
  if (!username) return HARERUYA_ANNEX_SCREEN_NAME;
  return TWEET_HISTORY_SCREEN_BY_USERNAME[username] ?? HARERUYA_ANNEX_SCREEN_NAME;
}
