import * as wanakana from "wanakana";
import type { ComparisonItem } from "../types";

const CARD_NAME_PATTERN = /^(.+?)〈([^〉]+)〉\[([^\]]+)\]$/;

const STRIP_SYMBOLS = /[〈〉＜＞\[\]【】()（）{}｛｝:：\\・･\-－—_＿,，.．!！?？☆★♦♢*＊+＋#＃@＠&＆'"`´'']/g;

const LATIN_TOKEN = /^[a-z0-9][a-z0-9+\-]*$/i;

const PACK_LIKE_PREFIX =
  /^(sv|sm|xy|bw|cp|mc|eb|si|sc|sf|sj|sk|cl|so|ma|pp|mp|xy|bw|hs|sd|xyg)/i;

const RARITY_TOKENS = new Set(["ex", "vmax", "vstar", "sar"]);

function isPackLikeToken(token: string): boolean {
  if (/\d/.test(token)) return true;
  if (token.length <= 4 && PACK_LIKE_PREFIX.test(token)) return true;
  return false;
}

export function shouldKeepLatinToken(token: string): boolean {
  if (!LATIN_TOKEN.test(token)) return false;
  if (RARITY_TOKENS.has(token)) return true;
  return isPackLikeToken(token);
}

export interface ParsedCardName {
  cardName: string;
  number: string;
  pack: string;
}

export interface SearchIndexEntry {
  item: ComparisonItem;
  cardName: string;
  number: string;
  pack: string;
  tags: string[];
  romajiName: string;
  searchText: string;
  normalizedCardName: string;
  hiraganaCardName: string;
}

export function parseCardName(name: string): ParsedCardName | null {
  const match = CARD_NAME_PATTERN.exec(name);
  if (!match) return null;

  const [, cardName, number, pack] = match;
  return { cardName, number, pack };
}

function tokenizeRaw(query: string): string[] {
  const text = query
    .normalize("NFKC")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
    .replace(STRIP_SYMBOLS, " ");

  return text.split(/\s+/).filter(Boolean);
}

export function normalizeToken(value: string): string {
  const trimmed = value.normalize("NFKC").trim().toLowerCase();
  if (!trimmed) return "";

  if (shouldKeepLatinToken(trimmed)) {
    return trimmed;
  }

  if (wanakana.isRomaji(trimmed)) {
    return trimmed;
  }

  return wanakana.toKatakana(trimmed).toLowerCase();
}

export function normalizeSearchText(value: string): string {
  return tokenizeRaw(value).map(normalizeToken).join(" ");
}

export function tokenizeQuery(query: string): string[] {
  return tokenizeRaw(query).map(normalizeToken).filter(Boolean);
}

function extractSearchTags(cardName: string): string[] {
  const tags = new Set<string>();

  if (cardName.includes("ボールミラー")) tags.add("ボールミラー");
  if (cardName.includes("未開封")) tags.add("未開封");
  if (cardName.includes("ミラー") && !cardName.includes("ドーミラー")) tags.add("ミラー");

  const withoutVstar = cardName.replace(/vstar/gi, "");
  if (/sar/i.test(withoutVstar)) tags.add("sar");
  if (/vmax/i.test(cardName)) tags.add("vmax");
  if (/vstar/i.test(cardName)) tags.add("vstar");
  if (/(?:^|\s|[^a-z])ex$/i.test(cardName.replace(/\s/g, "")) || /\bex\b/i.test(cardName)) {
    tags.add("ex");
  }

  return [...tags];
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
  const compactToken = token.replace(/\//g, "").replace(/\//g, "");

  if (token.includes("/")) {
    return normalizeToken(number) === normalizeToken(token);
  }

  if (compactNumber === compactToken) return true;
  if (compactNumber.endsWith(compactToken) || compactNumber.startsWith(compactToken)) {
    return true;
  }

  return normalizeToken(number).includes(normalizeToken(token));
}

export function isRomajiQuery(token: string): boolean {
  return LATIN_TOKEN.test(token) && wanakana.isRomaji(token) && !shouldKeepLatinToken(token);
}

function romajiMatches(entry: SearchIndexEntry, token: string): boolean {
  if (!entry.romajiName) return false;
  return entry.romajiName.includes(token) || entry.romajiName.startsWith(token);
}

function latinTokenMatches(entry: SearchIndexEntry, token: string): boolean {
  if (token === "sar") return entry.tags.includes("sar");
  if (token === "vmax") return entry.tags.includes("vmax");
  if (token === "vstar") return entry.tags.includes("vstar");
  if (token === "ex") return entry.tags.includes("ex");

  if (packMatches(entry.pack, token)) return true;
  if (numberMatches(entry.number, token)) return true;
  if (entry.tags.includes(token)) return true;

  return entry.normalizedCardName.includes(token);
}

function japaneseTokenMatches(entry: SearchIndexEntry, token: string): boolean {
  if (token === "ボールミラー") {
    return entry.cardName.includes("ボールミラー");
  }

  if (token === "ミラー") {
    return entry.cardName.includes("ミラー") && !entry.cardName.includes("ドーミラー");
  }

  const cardName = normalizeToken(entry.cardName);
  const hiraganaName = entry.hiraganaCardName;
  const hiraganaToken = wanakana.toHiragana(token);

  return (
    cardName.includes(token) ||
    entry.searchText.includes(token) ||
    hiraganaName.includes(hiraganaToken) ||
    entry.tags.some((tag) => normalizeToken(tag).includes(token))
  );
}

function tokenMatches(entry: SearchIndexEntry, token: string): boolean {
  if (!token) return true;
  if (shouldKeepLatinToken(token)) return latinTokenMatches(entry, token);
  if (isRomajiQuery(token)) return romajiMatches(entry, token);
  return japaneseTokenMatches(entry, token);
}

export function shouldUseFuzzySearch(token: string): boolean {
  if (RARITY_TOKENS.has(token)) return false;
  if (shouldKeepLatinToken(token)) return false;
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(token)) return false;
  return wanakana.isRomaji(token) && token.length >= 4;
}

export function buildSearchIndex(items: ComparisonItem[]): SearchIndexEntry[] {
  return items.map((item) => {
    const parsed = parseCardName(item.name);
    const cardName = parsed?.cardName ?? item.name;
    const number = parsed?.number ?? "";
    const pack = parsed?.pack ?? "";
    const numberCompact = number.replace(/\//g, "");
    const tags = extractSearchTags(cardName);
    const romajiName = wanakana.isJapanese(cardName)
      ? wanakana.toRomaji(cardName).toLowerCase()
      : "";
    const normalizedCardName = normalizeToken(cardName);
    const hiraganaCardName = wanakana.toHiragana(cardName);

    const searchText = normalizeSearchText(
      [
        item.name,
        cardName,
        romajiName,
        hiraganaCardName,
        number,
        pack,
        numberCompact,
        `${cardName} ${number} ${pack}`,
        cardName.replace(/\s/g, ""),
        ...tags,
      ].join(" "),
    );

    return {
      item,
      cardName,
      number,
      pack,
      tags,
      romajiName,
      searchText,
      normalizedCardName,
      hiraganaCardName,
    };
  });
}

export function scoreEntry(entry: SearchIndexEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  let score = 0;

  for (const token of tokens) {
    if (!tokenMatches(entry, token)) {
      return -1;
    }

    score += 20;

    if (shouldKeepLatinToken(token)) {
      if (packMatches(entry.pack, token)) score += 18;
      if (numberMatches(entry.number, token)) score += 16;
      if (entry.tags.includes(token)) score += 14;
    } else if (entry.normalizedCardName === token) {
      score += 15;
    }
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    if (packMatches(entry.pack, token)) score += 12;
    if (numberMatches(entry.number, token)) score += 10;
    if (entry.normalizedCardName === token) score += 15;
  }

  return score;
}
