import { prefetchImage } from "./imageCache";
import {
  findCatalogProductByCardName,
  loadHareruyaCatalog,
} from "./fetch/hareruyaCatalog";
import {
  buildHareruyaVariantPackCode,
  detectMirrorVariantLabel,
  normalizeImageLookupKey,
} from "./normalize";

const CARD_CODE_PATTERN = /〈([^〉]+)〉\[([^\]]+)\]/;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.9",
};

const MAX_FETCH_RETRIES = 3;
const RETRY_DELAY_MS = 400;
const MAX_PRODUCT_LOOKUPS_PER_QUERY = 20;
const MAX_TOTAL_PRODUCT_LOOKUPS = 35;

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

/** 比較表カード名と晴れる屋2商品名が同一カードか */
export function isExactProductMatch(cardName: string, title: string): boolean {
  return normalizeImageLookupKey(title) === normalizeImageLookupKey(cardName);
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

function extractCardNamePrefix(cardName: string): string | null {
  const match = CARD_CODE_PATTERN.exec(cardName);
  if (!match) return null;

  const prefix = cardName.slice(0, match.index).trim();
  return prefix || null;
}

/** 比較表のカード名 prefix を晴れる屋2検索向けの語句列に変換 */
function formatNameForSearch(prefix: string): string {
  return prefix
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 買取表に近い「カード名:ミラー種別」形式（レアリティ等は除く） */
function formatBuyListStyleNameForSearch(prefix: string): string {
  return prefix
    .replace(/\s+\(([^)]+)\)\s*$/, ":$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** 具体 → 広い順に検索クエリを並べる（完全一致商品を優先的にヒットさせる） */
export function resolveSearchQueries(cardName: string): string[] {
  const match = CARD_CODE_PATTERN.exec(cardName);
  if (!match) return [];

  const [, number, pack] = match;
  const prefix = extractCardNamePrefix(cardName);
  const variant = detectMirrorVariantLabel(cardName);
  const variantPack = variant ? buildHareruyaVariantPackCode(pack, variant) : null;

  const queries: string[] = [];

  if (prefix) {
    const nameQuery = formatNameForSearch(prefix);
    const buyListName = formatBuyListStyleNameForSearch(prefix);

    if (variantPack) {
      if (buyListName !== nameQuery) {
        queries.push(`${buyListName} ${number} ${variantPack}`);
      }
      queries.push(`${nameQuery} ${number} ${variantPack}`);
    }

    queries.push(`${nameQuery} ${number} ${pack}`);
  }

  if (variantPack) {
    queries.push(`${number} ${variantPack}`);
  }

  queries.push(`${number} ${pack}`);

  return [...new Set(queries)];
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
): Promise<{ productId: string; title: string; imageUrl: string | null; searchQuery: string } | null> {
  const queries = resolveSearchQueries(cardName);
  let totalLookups = 0;

  for (const query of queries) {
    const productIds = await searchProductIds(query);
    const remaining = MAX_TOTAL_PRODUCT_LOOKUPS - totalLookups;
    const idsToCheck = productIds.slice(0, Math.min(MAX_PRODUCT_LOOKUPS_PER_QUERY, remaining));
    if (idsToCheck.length === 0) continue;

    totalLookups += idsToCheck.length;

    const products = await Promise.all(
      idsToCheck.map(async (productId) => {
        const product = await fetchProduct(productId);
        if (!product) return null;
        if (!isExactProductMatch(cardName, product.title)) return null;

        return {
          productId,
          title: product.title,
          imageUrl: product.imageUrl,
          rank: rankMatchedProduct(cardName, product.title),
          searchQuery: query,
        };
      }),
    );

    let best: (typeof products)[number] = null;

    for (const product of products) {
      if (!product) continue;
      if (!best || product.rank > best.rank) {
        best = product;
      }
    }

    if (best) {
      return {
        productId: best.productId,
        title: best.title,
        imageUrl: best.imageUrl,
        searchQuery: best.searchQuery,
      };
    }
  }

  return null;
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

  let matched: Awaited<ReturnType<typeof findMatchingProduct>> = null;

  try {
    await loadHareruyaCatalog();
    const catalogProduct = findCatalogProductByCardName(cardName);
    if (catalogProduct?.image_url && isExactProductMatch(cardName, catalogProduct.title)) {
      matched = {
        productId: String(catalogProduct.id),
        title: catalogProduct.title,
        imageUrl: catalogProduct.image_url,
        searchQuery: "buying-list-catalog",
      };
    }

    if (!matched) {
      matched = await findMatchingProduct(cardName);
    }
  } catch {
    throw new Error("晴れる屋2への接続に失敗しました。しばらくしてから更新してください。");
  }

  const result: CardImageResult = {
    imageUrl: matched?.imageUrl ?? null,
    productTitle: matched?.title ?? null,
    searchQuery: matched?.searchQuery ?? searchQuery,
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

export function scoreProductTitle(cardName: string, title: string): number {
  return isExactProductMatch(cardName, title) ? 1000 : 0;
}
