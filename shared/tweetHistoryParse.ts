export interface TweetHistoryEntry {
  id: string;
  postedAt: string;
  cardName: string;
  rawText: string;
  tweetUrl: string;
  dailyIndex?: number;
  dailyTotal?: number;
}

export interface RawTweetInput {
  id: string;
  postedAt: string;
  text: string;
  tweetUrl?: string;
}

export interface TimelinePostRef {
  id: string;
  postedAt: string;
}

const BUY_INFO_PREFIX = "【買取情報】";
export const HARERUYA_ANNEX_SCREEN_NAME = "hareruya2annex";

const BRACKET_OPEN = /[(（\[［〈《【]/;
const BRACKET_CLOSE = /[)）\]］〉》】]/;

function isFooterLine(line: string): boolean {
  return (
    line.startsWith("#") ||
    line.startsWith("▼") ||
    line.includes("hareruya2.com") ||
    line.includes("アネックス店") ||
    line.includes("ハレツー高田馬場店") ||
    line.includes("ハレツー郡山店") ||
    line.includes("までお持ちこみ") ||
    line.includes("ポケカの買取は")
  );
}

function isPriceLine(line: string): boolean {
  const normalized = line.replace(/✨+$/, "");
  return /^¥[\d,]+$/.test(normalized) || /^\d{1,3}(?:,\d{3})*円$/.test(normalized);
}

function isCommentLine(line: string): boolean {
  return line.startsWith("「") && line.endsWith("」");
}

export function buildTweetUrl(tweetId: string, screenName = HARERUYA_ANNEX_SCREEN_NAME): string {
  return `https://x.com/${screenName}/status/${tweetId}`;
}

/** 【買取情報】投稿からカード名（()[]等を含む1文）を抽出 */
export function extractBuyInfoCardName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line === BUY_INFO_PREFIX) continue;
    if (isCommentLine(line) || isFooterLine(line) || isPriceLine(line)) continue;
    if (!BRACKET_OPEN.test(line) || !BRACKET_CLOSE.test(line)) continue;
    return line;
  }

  return null;
}

export function parseBuyInfoTweet(raw: RawTweetInput): TweetHistoryEntry | null {
  const text = raw.text.trim();
  if (!text.startsWith(BUY_INFO_PREFIX)) return null;

  const cardName = extractBuyInfoCardName(text);
  if (!cardName) return null;

  return {
    id: raw.id,
    postedAt: raw.postedAt,
    cardName,
    rawText: text,
    tweetUrl: raw.tweetUrl ?? buildTweetUrl(raw.id),
  };
}

export function parseBuyInfoTweets(rawTweets: RawTweetInput[]): TweetHistoryEntry[] {
  return rawTweets
    .map(parseBuyInfoTweet)
    .filter((entry): entry is TweetHistoryEntry => entry !== null)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

function getJstDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function buildDailyPostMetrics(
  buyInfoEntries: TweetHistoryEntry[],
  allTimelinePosts: TimelinePostRef[],
): Map<string, { dailyIndex: number; dailyTotal: number }> {
  const dayTotals = new Map<string, number>();

  for (const post of allTimelinePosts) {
    const key = getJstDateKey(post.postedAt);
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + 1);
  }

  const buyInfoByDay = new Map<string, TweetHistoryEntry[]>();

  for (const entry of buyInfoEntries) {
    const key = getJstDateKey(entry.postedAt);
    const bucket = buyInfoByDay.get(key);
    if (bucket) bucket.push(entry);
    else buyInfoByDay.set(key, [entry]);
  }

  const metrics = new Map<string, { dailyIndex: number; dailyTotal: number }>();

  for (const [dayKey, dayEntries] of buyInfoByDay) {
    const dailyTotal = dayTotals.get(dayKey) ?? dayEntries.length;
    const sortedAsc = [...dayEntries].sort(
      (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
    );

    sortedAsc.forEach((entry, index) => {
      metrics.set(entry.id, { dailyIndex: index + 1, dailyTotal });
    });
  }

  return metrics;
}

/**
 * その日の【買取情報】投稿の通番（分子）と、その日の総投稿数（分母）を付与。
 * 分子は同日の【買取情報】投稿を古い順に 1, 2, 3… と数えた値。
 */
export function annotateDailyPostOrder(
  entries: TweetHistoryEntry[],
  allTimelinePosts: TimelinePostRef[],
): TweetHistoryEntry[] {
  const metrics = buildDailyPostMetrics(entries, allTimelinePosts);

  for (const entry of entries) {
    const daily = metrics.get(entry.id);
    if (!daily) continue;
    entry.dailyIndex = daily.dailyIndex;
    entry.dailyTotal = daily.dailyTotal;
  }

  return entries;
}
