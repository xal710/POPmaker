import { fetchTextWithCurl, parsePrice, sleep } from "./http";
import {
  ensureCardRushSellPriceCache,
  getCachedCardRushSellPrice,
  loadCardRushSellPriceCache,
  countSellCacheStatsForProductIds,
  setCachedCardRushSellPrice,
  shouldRefetchCardRushSellPrice,
} from "./cardrushSellCache";

const PRODUCT_BASE_URL = "https://www.cardrush-pokemon.jp/product";
/** 429 回避のため並列を抑える */
const FETCH_CONCURRENCY = 3;
const FETCH_DELAY_MS = 250;
const MAX_ATTEMPTS = 3;

const sellPriceMemoryCache = new Map<number, number | null>();

export interface CardrushSellFetchStats {
  processed: number;
  total: number;
  withPrice: number;
  pending: number;
}

export function parseCardRushSellPriceFromHtml(html: string): number | null {
  const match = html.match(/id="pricech">([0-9,]+)円/);
  if (!match) return null;
  return parsePrice(match[1]);
}

function looksLikeBlockedPage(html: string): boolean {
  return /just a moment|cf-browser-verification|challenge-platform|Attention Required/i.test(
    html,
  );
}

export async function fetchCardRushSellPrice(productId: number): Promise<number | null> {
  if (!shouldRefetchCardRushSellPrice(productId)) {
    const cached = getCachedCardRushSellPrice(productId);
    if (cached !== undefined) {
      sellPriceMemoryCache.set(productId, cached);
      return cached;
    }
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const html = await fetchTextWithCurl(`${PRODUCT_BASE_URL}/${productId}`);
      if (looksLikeBlockedPage(html) && !html.includes("pricech")) {
        throw new Error(`blocked page for product ${productId}`);
      }

      const price = parseCardRushSellPriceFromHtml(html);
      // ページは取れたが価格要素がない場合だけ「価格なし」として確定保存
      sellPriceMemoryCache.set(productId, price);
      setCachedCardRushSellPrice(productId, price);
      return price;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryDelay = /HTTP 429/.test(message) ? 1500 * attempt : 300 * attempt;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(retryDelay);
      }
    }
  }

  // レート制限等の失敗はキャッシュしない（未取得扱いのまま）
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function clearCardRushSellPriceMemoryCache(): void {
  sellPriceMemoryCache.clear();
}

export interface FetchCardRushSellPricesOptions {
  buyListUpdatedAt?: string | null;
  forceRefetch?: boolean;
  onStats?: (stats: CardrushSellFetchStats) => void;
}

function reportStats(
  unique: number[],
  onStats?: (stats: CardrushSellFetchStats) => void,
): void {
  if (!onStats) return;
  const { processed, withPrice, pending } = countSellCacheStatsForProductIds(unique);
  onStats({ processed, total: unique.length, withPrice, pending });
}

export async function fetchCardRushSellPrices(
  productIds: number[],
  onProgress?: (message: string) => void,
  options: FetchCardRushSellPricesOptions = {},
): Promise<Map<number, number>> {
  const unique = [...new Set(productIds.filter((id) => id > 0))];
  const result = new Map<number, number>();
  if (unique.length === 0) return result;

  ensureCardRushSellPriceCache(options.buyListUpdatedAt ?? null);
  loadCardRushSellPriceCache();

  const pending: number[] = [];
  for (const productId of unique) {
    if (options.forceRefetch || shouldRefetchCardRushSellPrice(productId, options.forceRefetch)) {
      pending.push(productId);
      continue;
    }

    const cached = getCachedCardRushSellPrice(productId);
    if (cached != null) {
      result.set(productId, cached);
      sellPriceMemoryCache.set(productId, cached);
    } else if (cached === null) {
      sellPriceMemoryCache.set(productId, null);
    }
  }

  reportStats(unique, options.onStats);
  onProgress?.(
    `カードラッシュ販売価格: 価格あり ${result.size.toLocaleString("ja-JP")}件 / 未取得 ${pending.length.toLocaleString("ja-JP")}件 / 対象 ${unique.length.toLocaleString("ja-JP")}件`,
  );

  let successCount = 0;
  let failCount = 0;
  let rateLimited = false;

  for (let start = 0; start < pending.length; start += FETCH_CONCURRENCY) {
    const batch = pending.slice(start, start + FETCH_CONCURRENCY);
    onProgress?.(
      `カードラッシュ販売価格: ${Math.min(start + batch.length, pending.length).toLocaleString("ja-JP")}/${pending.length.toLocaleString("ja-JP")} 件を取得中（価格あり ${result.size.toLocaleString("ja-JP")}件）...`,
    );

    const batchResults = await Promise.all(
      batch.map(async (productId) => {
        try {
          const price = await fetchCardRushSellPrice(productId);
          return { productId, price, error: false as const, rateLimited: false as const };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            productId,
            price: null,
            error: true as const,
            rateLimited: /HTTP 429/.test(message),
          };
        }
      }),
    );

    for (const { productId, price, error, rateLimited: batchRateLimited } of batchResults) {
      if (error) {
        failCount += 1;
        if (batchRateLimited) rateLimited = true;
        continue;
      }
      successCount += 1;
      if (price != null) {
        result.set(productId, price);
      }
    }

    reportStats(unique, options.onStats);

    if (start + FETCH_CONCURRENCY < pending.length) {
      await sleep(rateLimited ? FETCH_DELAY_MS * 4 : FETCH_DELAY_MS);
      rateLimited = false;
    }
  }

  reportStats(unique, options.onStats);
  onProgress?.(
    `カードラッシュ販売価格: 価格あり ${result.size.toLocaleString("ja-JP")}/${unique.length.toLocaleString("ja-JP")} 件` +
      (failCount > 0
        ? `（今回成功 ${successCount.toLocaleString("ja-JP")} / 一時失敗 ${failCount.toLocaleString("ja-JP")}・次回再取得）`
        : ""),
  );

  return result;
}
