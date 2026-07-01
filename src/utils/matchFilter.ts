import type { ComparisonItem } from "../types";

export type MatchFilter = "matched" | "unmatched" | "all";

export const MATCH_FILTER_LABELS: Record<MatchFilter, string> = {
  matched: "比較済み",
  unmatched: "未比較",
  all: "すべて",
};

export const DEFAULT_MATCH_FILTER: MatchFilter = "matched";

export function isMatchFilterActive(filter: MatchFilter): boolean {
  return filter !== DEFAULT_MATCH_FILTER;
}

export function applyMatchFilter(items: ComparisonItem[], filter: MatchFilter): ComparisonItem[] {
  if (filter === "all") return items;
  if (filter === "matched") return items.filter((item) => item.matched);
  return items.filter((item) => !item.matched);
}

export function countByMatchFilter(items: ComparisonItem[]): Record<MatchFilter, number> {
  const matched = items.filter((item) => item.matched).length;
  return {
    matched,
    unmatched: items.length - matched,
    all: items.length,
  };
}
