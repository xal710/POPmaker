import { prefetchImage } from "./imageCache";
import {
  buildHareruyaVariantPackCode,
  detectMirrorVariantLabel,
  normalizeHareruyaName,
} from "./normalize";

const CARD_CODE_PATTERN = /〈([^〉]+)〉\[([^\]]+)\]/;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.9",
};

const MAX_FETCH_RETRIES = 2;
const RETRY_DELAY_MS = 350;
const MAX_PRODUCT_LOOKUPS = 8;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...HEADERS,
          ...(init?.headers ?? {}),
        },
      });

      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`HTTP ${response.status}: ${url}`);
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`HTTP request failed: ${url}`);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.text();
}

export interface CardImageResult {
  imageUrl: string | null;
  productTitle: string | null;
  searchQuery: string | null;
  productId: string | null;
  cached: boolean;
}

interface CacheEntry {
  result: CardImageResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function normalizeCardNameKey(cardName: string): string {
  return cardName.replace(/\s+/g, " ").trim();
}

function normalizeProductTitleKey(title: string): string {
  return normalizeHareruyaName(title).replace(/\s+/g, " ").trim();
}

/** 比較表カード名と晴れる屋2商品名が同一カードか（価格突合と同じ正規化） */
export function isExactProductMatch(cardName: string, title: string): boolean {
  return normalizeProductTitleKey(title) === normalizeCardNameKey(cardName);
}

function rankMatchedProduct(cardName: string, title: string): number {
  let score = 0;

  if (!cardName.includes("PSA") && /PSA\d*/i.test(title)) score -= 100;
  if (!cardName.includes("未開封") && title.includes("未開封")) score -= 100;
  if (title.includes("【")) score -= 10;

  return score;
}

export function parseCardSearchQuery(cardName: string): string | null {
  const match = CARD_CODE_PATTERN.exec(cardName);
  if (!match) return null;

  const [, number, pack] = match;
  const variant = detectMirrorVariantLabel(cardName);
  if (variant) {
    return `${number} ${buildHareruyaVariantPackCode(pack, variant)}`;
  }

  return `${number} ${pack}`;
}

function parseFallbackSearchQuery(cardName: string): string | null {
  const match = CARD_CODE_PATTERN.exec(cardName);
  if (!match) return null;
  const [, number, pack] = match;
  return `${number} ${pack}`;
}

async function searchProductIds(query: string): Promise<string[]> {
  const url = `https://www.hareruya2.com/search?${new URLSearchParams({
    q: query,
    type: "product",
  })}`;

  const html = await fetchText(url);
  const ids = [...html.matchAll(/\/products\/(\d{10,})/g)].map((match) => match[1]);
  return [...new Set(ids)];
}

async function resolveSearchQueries(cardName: string): Promise<string[]> {
  const primaryQuery = parseCardSearchQuery(cardName);
  if (!primaryQuery) return [];

  const queries = [primaryQuery];
  const fallbackQuery = parseFallbackSearchQuery(cardName);
  if (fallbackQuery && fallbackQuery !== primaryQuery) {
    queries.push(fallbackQuery);
  }

  return queries;
}

async function fetchProduct(
  productId: string,
): Promise<{ title: string; imageUrl: string | null } | null> {
  const url = `https://www.hareruya2.com/products/${productId}.json`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      product?: {
        title?: string;
        images?: Array<{ src?: string }>;
      };
    };

    const product = data.product;
    if (!product?.title) return null;

    return {
      title: product.title,
      imageUrl: product.images?.[0]?.src ?? null,
    };
  } catch {
    return null;
  }
}

async function findMatchingProduct(
  cardName: string,
): Promise<{ productId: string; title: string; imageUrl: string | null } | null> {
  const queries = await resolveSearchQueries(cardName);
  const seenIds = new Set<string>();
  let best:
    | {
        productId: string;
        title: string;
        imageUrl: string | null;
        rank: number;
      }
    | null = null;

  for (const query of queries) {
    const productIds = await searchProductIds(query);

    for (const productId of productIds.slice(0, MAX_PRODUCT_LOOKUPS)) {
      if (seenIds.has(productId)) continue;
      seenIds.add(productId);

      const product = await fetchProduct(productId);
      if (!product) continue;
      if (!isExactProductMatch(cardName, product.title)) continue;

      const rank = rankMatchedProduct(cardName, product.title);
      if (!best || rank > best.rank) {
        best = {
          productId,
          title: product.title,
          imageUrl: product.imageUrl,
          rank,
        };
      }
    }

    if (best) break;
  }

  return best;
}

export async function fetchCardImage(
  cardName: string,
  options: { refresh?: boolean } = {},
): Promise<CardImageResult> {
  if (options.refresh) {
    cache.delete(cardName);
  } else {
    const cached = cache.get(cardName);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }
  }

  const searchQuery = parseCardSearchQuery(cardName);
  if (!searchQuery) {
    return {
      imageUrl: null,
      productTitle: null,
      searchQuery: null,
      productId: null,
      cached: false,
    };
  }

  const matched = await findMatchingProduct(cardName);

  const result: CardImageResult = {
    imageUrl: matched?.imageUrl ?? null,
    productTitle: matched?.title ?? null,
    searchQuery,
    productId: matched?.productId ?? null,
    cached: false,
  };

  if (result.imageUrl) {
    void prefetchImage(result.imageUrl).catch(() => undefined);
  }

  cache.set(cardName, {
    result,
    expiresAt: Date.now() + (result.imageUrl ? CACHE_TTL_MS : 60_000),
  });

  return result;
}

/** @deprecated 完全一致判定へ移行。後方互換のため残す */
export function scoreProductTitle(cardName: string, title: string): number {
  return isExactProductMatch(cardName, title) ? 1000 : 0;
}
