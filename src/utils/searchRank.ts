import Fuse, { type IFuseOptions } from "fuse.js";
import * as wanakana from "wanakana";

import {
  buildSearchIndex,
  isRomajiQuery,
  normalizeToken,
  shouldKeepLatinToken,
  shouldUseFuzzySearch,
  tokenizeQuery,
  type SearchIndexEntry,
} from "./search";

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

export interface PreparedSearchIndex {
  entries: SearchIndexEntry[];
  fuse: Fuse<SearchIndexEntry>;
}

interface TokenContext {
  token: string;
  hiraganaToken: string;
  keepLatin: boolean;
  romaji: boolean;
}

function buildTokenContexts(tokens: string[]): TokenContext[] {
  return tokens.map((token) => ({
    token,
    hiraganaToken: wanakana.toHiragana(token),
    keepLatin: shouldKeepLatinToken(token),
    romaji: isRomajiQuery(token),
  }));
}

function packMatches(pack: string, token: string): boolean {
  const packCode = normalizeToken(pack);
  const query = normalizeToken(token);
  if (!packCode || !query) return false;
  if (packCode === query) return true;

  if (packCode.startsWith(query)) {
    const suffix = packCode.slice(query.length);
    return suffix === "" || /^[a-z0-9]/i.test(suffix);
  }

  return false;
}

function numberMatches(number: string, token: string): boolean {
  const compactNumber = number.replace(/\//g, "");
  const compactToken = token.replace(/\//g, "");

  if (token.includes("/")) {
    return normalizeToken(number) === normalizeToken(token);
  }

  if (compactNumber === compactToken) return true;
  if (compactNumber.endsWith(compactToken) || compactNumber.startsWith(compactToken)) {
    return true;
  }

  return normalizeToken(number).includes(normalizeToken(token));
}

function passesQuickFilter(entry: SearchIndexEntry, contexts: TokenContext[]): boolean {
  for (const ctx of contexts) {
    if (ctx.romaji) {
      if (!entry.romajiName.includes(ctx.token)) return false;
      continue;
    }

    if (!entry.searchText.includes(ctx.token)) {
      return false;
    }
  }

  return true;
}

function entryMatches(entry: SearchIndexEntry, ctx: TokenContext): boolean {
  const { token, hiraganaToken } = ctx;

  if (ctx.keepLatin) {
    if (token === "sar") return entry.tags.includes("sar");
    if (token === "vmax") return entry.tags.includes("vmax");
    if (token === "vstar") return entry.tags.includes("vstar");
    if (token === "ex") return entry.tags.includes("ex");
    if (packMatches(entry.pack, token)) return true;
    if (numberMatches(entry.number, token)) return true;
    if (entry.tags.includes(token)) return true;
    return entry.normalizedCardName.includes(token);
  }

  if (ctx.romaji) {
    return entry.romajiName.includes(token);
  }

  if (token === "ボールミラー") {
    return entry.cardName.includes("ボールミラー");
  }

  if (token === "ミラー") {
    return entry.cardName.includes("ミラー") && !entry.cardName.includes("ドーミラー");
  }

  return (
    entry.normalizedCardName.includes(token) ||
    entry.searchText.includes(token) ||
    entry.hiraganaCardName.includes(hiraganaToken)
  );
}

function scoreEntryFast(entry: SearchIndexEntry, contexts: TokenContext[]): number {
  let score = 0;

  for (const ctx of contexts) {
    if (!entryMatches(entry, ctx)) {
      return -1;
    }

    score += 20;

    if (ctx.keepLatin) {
      if (packMatches(entry.pack, ctx.token)) score += 18;
      if (numberMatches(entry.number, ctx.token)) score += 16;
      if (entry.tags.includes(ctx.token)) score += 14;
    } else if (entry.normalizedCardName === ctx.token) {
      score += 15;
    }
  }

  if (contexts.length === 1) {
    const ctx = contexts[0];
    if (packMatches(entry.pack, ctx.token)) score += 12;
    if (numberMatches(entry.number, ctx.token)) score += 10;
    if (entry.normalizedCardName === ctx.token) score += 15;
  }

  return score;
}

export function prepareSearchIndex(items: Parameters<typeof buildSearchIndex>[0]): PreparedSearchIndex {
  const entries = buildSearchIndex(items);
  return {
    entries,
    fuse: new Fuse(entries, FUSE_OPTIONS),
  };
}

export function rankSearchEntries(index: PreparedSearchIndex, query: string) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return index.entries.map((entry) => entry.item);
  }

  const contexts = buildTokenContexts(tokens);
  const scored: Array<{ entry: SearchIndexEntry; score: number }> = [];

  for (const entry of index.entries) {
    if (!passesQuickFilter(entry, contexts)) {
      continue;
    }

    const score = scoreEntryFast(entry, contexts);
    if (score >= 0) {
      scored.push({ entry, score });
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
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
