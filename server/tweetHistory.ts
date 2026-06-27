import {
  annotateDailyPostOrder,
  buildTweetUrl,
  HARERUYA_ANNEX_SCREEN_NAME,
  parseBuyInfoTweet,
  type RawTweetInput,
  type TweetHistoryEntry,
} from "../shared/tweetHistoryParse";

const FXTWITTER_TIMELINE_URL = `https://api.fxtwitter.com/2/profile/${HARERUYA_ANNEX_SCREEN_NAME}/statuses`;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

interface FxTimelineResponse {
  results?: FxStatus[];
  cursor?: {
    bottom?: string;
  };
}

interface FxStatus {
  type?: string;
  id?: string;
  text?: string;
  created_at?: string;
  created_at_ms?: number;
}

function parsePostedAt(status: FxStatus): string | null {
  if (typeof status.created_at_ms === "number" && Number.isFinite(status.created_at_ms)) {
    return new Date(status.created_at_ms).toISOString();
  }

  if (status.created_at) {
    const parsed = new Date(status.created_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

async function fetchTimelinePage(cursor?: string): Promise<FxTimelineResponse> {
  const url = new URL(FXTWITTER_TIMELINE_URL);
  url.searchParams.set("count", String(PAGE_SIZE));
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "pop-kaitori-tool/0.1 (local tweet history)",
    },
  });

  if (!response.ok) {
    throw new Error(`X投稿の取得に失敗しました (${response.status})`);
  }

  return (await response.json()) as FxTimelineResponse;
}

async function fetchRecentStatuses(): Promise<FxStatus[]> {
  const statuses: FxStatus[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await fetchTimelinePage(cursor);
    const pageResults = payload.results ?? [];
    statuses.push(...pageResults.filter((item) => item.type === "status" || !item.type));

    cursor = payload.cursor?.bottom;
    if (!cursor || pageResults.length === 0) {
      break;
    }
  }

  return statuses;
}

export async function fetchBuyInfoTweetHistory(): Promise<TweetHistoryEntry[]> {
  const statuses = await fetchRecentStatuses();
  const allTimeline: { id: string; postedAt: string }[] = [];
  const rawTweets: RawTweetInput[] = [];

  for (const status of statuses) {
    if (!status.id || !status.text) continue;

    const postedAt = parsePostedAt(status);
    if (!postedAt) continue;

    allTimeline.push({ id: status.id, postedAt });
    rawTweets.push({
      id: status.id,
      postedAt,
      text: status.text,
      tweetUrl: buildTweetUrl(status.id),
    });
  }

  const entries = rawTweets
    .map(parseBuyInfoTweet)
    .filter((entry): entry is TweetHistoryEntry => entry !== null)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  return annotateDailyPostOrder(entries, allTimeline);
}
