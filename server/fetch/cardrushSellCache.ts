import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDataDir } from "../config";

export interface CardRushSellPriceEntry {
  price: number | null;
  fetchedAt: string;
}

export interface CardRushSellPriceCacheFile {
  buyListUpdatedAt: string | null;
  prices: Record<string, CardRushSellPriceEntry>;
}

const CACHE_FILENAME = "cardrush_sell_prices.json";
/** null（価格なし）を再取得するまでの最短間隔 */
const NULL_RETRY_MS = 6 * 60 * 60 * 1000;

let memoryCache: CardRushSellPriceCacheFile | null = null;

function emptyCache(buyListUpdatedAt: string | null = null): CardRushSellPriceCacheFile {
  return { buyListUpdatedAt, prices: {} };
}

export function getCardRushSellPriceCachePath(): string {
  return resolve(getDataDir(), CACHE_FILENAME);
}

function readCacheFromDisk(): CardRushSellPriceCacheFile | null {
  const path = getCardRushSellPriceCachePath();
  if (!existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as CardRushSellPriceCacheFile;
    if (!parsed || typeof parsed.prices !== "object" || parsed.prices == null) {
      return null;
    }
    return {
      buyListUpdatedAt: parsed.buyListUpdatedAt ?? null,
      prices: parsed.prices,
    };
  } catch {
    return null;
  }
}

export function loadCardRushSellPriceCache(): CardRushSellPriceCacheFile {
  if (memoryCache) return memoryCache;
  memoryCache = readCacheFromDisk() ?? emptyCache();
  return memoryCache;
}

export function saveCardRushSellPriceCache(cache: CardRushSellPriceCacheFile): void {
  memoryCache = cache;
  const path = getCardRushSellPriceCachePath();
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(cache, null, 2), "utf-8");
}

export function clearCardRushSellPriceCacheDisk(): void {
  memoryCache = emptyCache();
  saveCardRushSellPriceCache(memoryCache);
}

/**
 * 買取リストの版が変わっても販売価格キャッシュは消さない。
 * （版が変わるたびに数千件の再取得が走るのを防ぐ）
 */
export function ensureCardRushSellPriceCache(buyListUpdatedAt: string | null): CardRushSellPriceCacheFile {
  const cache = loadCardRushSellPriceCache();
  if (!cache.buyListUpdatedAt && buyListUpdatedAt) {
    cache.buyListUpdatedAt = buyListUpdatedAt;
    saveCardRushSellPriceCache(cache);
  } else if (buyListUpdatedAt && cache.buyListUpdatedAt !== buyListUpdatedAt) {
    cache.buyListUpdatedAt = buyListUpdatedAt;
    saveCardRushSellPriceCache(cache);
  }
  return cache;
}

export function getCachedCardRushSellPrice(productId: number): number | null | undefined {
  const entry = loadCardRushSellPriceCache().prices[String(productId)];
  if (!entry) return undefined;
  return entry.price;
}

export function shouldRefetchCardRushSellPrice(productId: number, forceRefetch = false): boolean {
  if (forceRefetch) return true;
  const entry = loadCardRushSellPriceCache().prices[String(productId)];
  if (!entry) return true;
  if (entry.price != null) return false;
  const fetchedAt = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt >= NULL_RETRY_MS;
}

export function setCachedCardRushSellPrice(productId: number, price: number | null): void {
  const cache = loadCardRushSellPriceCache();
  cache.prices[String(productId)] = {
    price,
    fetchedAt: new Date().toISOString(),
  };
  saveCardRushSellPriceCache(cache);
}

export function deleteCachedCardRushSellPrice(productId: number): void {
  const cache = loadCardRushSellPriceCache();
  delete cache.prices[String(productId)];
  saveCardRushSellPriceCache(cache);
}

/** 価格なし（null）のキャッシュだけ削除して再取得対象に戻す */
export function clearNullCardRushSellPrices(): number {
  const cache = loadCardRushSellPriceCache();
  let removed = 0;
  for (const [id, entry] of Object.entries(cache.prices)) {
    if (entry.price == null) {
      delete cache.prices[id];
      removed += 1;
    }
  }
  if (removed > 0) {
    saveCardRushSellPriceCache(cache);
  }
  return removed;
}

export function countCachedCardRushSellPrices(): number {
  return Object.keys(loadCardRushSellPriceCache().prices).length;
}

export function countSellCacheStatsForProductIds(productIds: number[]): {
  processed: number;
  withPrice: number;
  pending: number;
} {
  const unique = [...new Set(productIds.filter((id) => id > 0))];
  const cache = loadCardRushSellPriceCache();
  let processed = 0;
  let withPrice = 0;

  for (const productId of unique) {
    const entry = cache.prices[String(productId)];
    if (!entry) continue;
    processed += 1;
    if (entry.price != null) {
      withPrice += 1;
    }
  }

  return {
    processed,
    withPrice,
    pending: Math.max(0, unique.length - processed),
  };
}
