import {
  detectSeriesFromPack,
  extractPackCode,
  SERIES_OPTIONS,
  type CardSeries,
} from "../../shared/series";
import type { TweetHistoryEntry } from "../../shared/tweetHistoryParse";
import type { ComparisonItem } from "../types";
import { prepareSearchIndex, rankSearchEntries, type PreparedSearchIndex } from "./searchRank";

export { SERIES_OPTIONS, type CardSeries } from "../../shared/series";

export type TweetSeriesFilter = CardSeries | "all";

export const TWEET_SERIES_LABELS: Record<CardSeries, string> = {
  M: "M",
  SV: "SV",
  S: "S",
  SM: "SM",
  XY: "XY",
  BW: "BW",
};

export function getTweetEntrySeries(entry: TweetHistoryEntry): CardSeries | null {
  const pack = extractPackCode(entry.cardName);
  if (!pack) return null;
  return detectSeriesFromPack(pack);
}

export interface TweetHistorySearchIndex {
  prepared: PreparedSearchIndex;
  entries: TweetHistoryEntry[];
}

export function buildTweetHistorySearchIndex(entries: TweetHistoryEntry[]): TweetHistorySearchIndex {
  const items: ComparisonItem[] = entries.map((entry, index) => ({
    id: index,
    name: entry.cardName,
    cardrush: 0,
    hareruya2: 0,
    diff: 0,
    matched: true,
  }));
  return { prepared: prepareSearchIndex(items), entries };
}

export function filterTweetHistoryEntries(
  entries: TweetHistoryEntry[],
  query: string,
  seriesFilter: TweetSeriesFilter,
  searchIndex: TweetHistorySearchIndex,
): TweetHistoryEntry[] {
  let result = entries;

  if (seriesFilter !== "all") {
    result = result.filter((entry) => getTweetEntrySeries(entry) === seriesFilter);
  }

  if (query.trim()) {
    const matched = rankSearchEntries(searchIndex.prepared, query);
    const matchedIds = new Set(matched.map((item) => searchIndex.entries[item.id].id));
    result = result.filter((entry) => matchedIds.has(entry.id));
  }

  return result;
}

export function countTweetHistoryBySeries(
  entries: TweetHistoryEntry[],
): Record<CardSeries, number> {
  const counts = Object.fromEntries(SERIES_OPTIONS.map((key) => [key, 0])) as Record<
    CardSeries,
    number
  >;

  for (const entry of entries) {
    const series = getTweetEntrySeries(entry);
    if (series) counts[series] += 1;
  }

  return counts;
}

export function isTweetHistoryFilterActive(
  query: string,
  seriesFilter: TweetSeriesFilter,
): boolean {
  return query.trim().length > 0 || seriesFilter !== "all";
}
