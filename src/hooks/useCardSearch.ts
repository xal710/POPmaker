import Fuse from "fuse.js";
import { useMemo } from "react";
import type { ComparisonItem } from "../types";
import {
  buildSearchIndex,
  scoreEntry,
  shouldUseFuzzySearch,
  tokenizeQuery,
  type SearchIndexEntry,
} from "../utils/search";

const SUGGESTION_LIMIT = 8;

function rankEntries(entries: SearchIndexEntry[], query: string): ComparisonItem[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return entries.map((entry) => entry.item);
  }

  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map((result) => result.entry.item);
  }

  // 複数語は厳密一致のみ（Fuse だと「リザードン M5」等が大きく漏れる）
  if (tokens.length > 1) {
    return [];
  }

  if (!shouldUseFuzzySearch(tokens[0])) {
    return [];
  }

  const fuse = new Fuse(entries, {
    keys: [
      { name: "searchText", weight: 0.45 },
      { name: "cardName", weight: 0.35 },
      { name: "number", weight: 0.12 },
      { name: "pack", weight: 0.08 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  return fuse.search(tokens[0]).map((result) => result.item.item);
}

export function useCardSearch(items: ComparisonItem[], query: string) {
  const index = useMemo(() => buildSearchIndex(items), [items]);

  const results = useMemo(() => rankEntries(index, query), [index, query]);
  const suggestions = useMemo(() => results.slice(0, SUGGESTION_LIMIT), [results]);

  const isSearching = query.trim().length > 0;

  return {
    results,
    suggestions,
    isSearching,
    resultCount: results.length,
  };
}
