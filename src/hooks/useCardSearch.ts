import Fuse, { type IFuseOptions } from "fuse.js";
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

const FUSE_OPTIONS: IFuseOptions<SearchIndexEntry> = {
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
};

interface PreparedSearchIndex {
  entries: SearchIndexEntry[];
  fuse: Fuse<SearchIndexEntry>;
}

function prepareSearchIndex(items: ComparisonItem[]): PreparedSearchIndex {
  const entries = buildSearchIndex(items);
  return {
    entries,
    fuse: new Fuse(entries, FUSE_OPTIONS),
  };
}

function rankEntries(index: PreparedSearchIndex, query: string): ComparisonItem[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return index.entries.map((entry) => entry.item);
  }

  const scored = index.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map((result) => result.entry.item);
  }

  if (tokens.length > 1) {
    return [];
  }

  if (!shouldUseFuzzySearch(tokens[0])) {
    return [];
  }

  return index.fuse.search(tokens[0]).map((result) => result.item.item);
}

export function useCardSearch(items: ComparisonItem[], query: string) {
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const searchIndex = useMemo(() => {
    if (!isSearching) return null;
    return prepareSearchIndex(items);
  }, [items, isSearching]);

  const results = useMemo(() => {
    if (!isSearching) return items;
    return rankEntries(searchIndex!, trimmedQuery);
  }, [items, isSearching, searchIndex, trimmedQuery]);

  const suggestions = useMemo(() => results.slice(0, SUGGESTION_LIMIT), [results]);

  return {
    results,
    suggestions,
    isSearching,
    resultCount: results.length,
  };
}
