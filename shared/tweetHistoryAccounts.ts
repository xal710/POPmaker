import { HARERUYA_ANNEX_SCREEN_NAME } from "./tweetHistoryParse";

/** 後方互換: ログインID直指定（店舗未設定時のフォールバック） */
export const TWEET_HISTORY_SCREEN_BY_USERNAME: Record<string, string> = {
  "20260605": "hareruya2koriym",
  "k.ishigaki": "hareruya2tkdbb",
};

const SCREEN_NAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

/**
 * XプロフィールURL / @screen_name / screen_name からスクリーンネームを取り出す。
 * 例: https://x.com/hareruya2annex → hareruya2annex
 */
export function parseTweetHistoryProfileInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutAt = trimmed.replace(/^@+/, "");
  if (SCREEN_NAME_PATTERN.test(withoutAt)) {
    return withoutAt;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") {
      return null;
    }

    const segment = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!SCREEN_NAME_PATTERN.test(segment)) return null;
    if (["home", "explore", "search", "i", "intent", "share"].includes(segment.toLowerCase())) {
      return null;
    }
    return segment;
  } catch {
    return null;
  }
}

export function formatTweetHistoryProfileUrl(screenName: string): string {
  return `https://x.com/${screenName}`;
}

export function normalizeTweetHistoryByStore(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const next: Record<string, string> = {};
  for (const [store, raw] of Object.entries(value as Record<string, unknown>)) {
    const storeName = store.trim();
    if (!storeName || typeof raw !== "string") continue;
    const screenName = parseTweetHistoryProfileInput(raw);
    if (!screenName) continue;
    next[storeName] = screenName;
  }
  return next;
}

export function collectAccountStoreNames(
  accounts: Array<{ store?: string | null }>,
): string[] {
  const names = new Set<string>();
  for (const account of accounts) {
    const store = account.store?.trim();
    if (store) names.add(store);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ja"));
}

export interface ResolveTweetHistoryScreenOptions {
  username?: string | null;
  store?: string | null;
  byStore?: Record<string, string> | null;
}

export function resolveTweetHistoryScreenName(
  usernameOrOptions?: string | null | ResolveTweetHistoryScreenOptions,
): string {
  if (typeof usernameOrOptions === "string" || usernameOrOptions == null) {
    const username = usernameOrOptions;
    if (!username) return HARERUYA_ANNEX_SCREEN_NAME;
    return TWEET_HISTORY_SCREEN_BY_USERNAME[username] ?? HARERUYA_ANNEX_SCREEN_NAME;
  }

  const { username, store, byStore } = usernameOrOptions;
  const storeName = store?.trim();
  if (storeName && byStore) {
    const mapped = byStore[storeName];
    const screen = parseTweetHistoryProfileInput(mapped);
    if (screen) return screen;
  }

  if (username && TWEET_HISTORY_SCREEN_BY_USERNAME[username]) {
    return TWEET_HISTORY_SCREEN_BY_USERNAME[username];
  }

  return HARERUYA_ANNEX_SCREEN_NAME;
}
