import { prefetchImage } from "./imageCache";

const CARD_CODE_PATTERN = /〈([^〉]+)〉\[([^\]]+)\]/;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.9",
};

const MAX_FETCH_RETRIES = 3;
const RETRY_DELAY_MS = 800;

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

export function parseCardSearchQuery(cardName: string): string | null {
  const match = CARD_CODE_PATTERN.exec(cardName);
  if (!match) return null;
  const [, number, pack] = match;
  return `${number} ${pack}`;
}

function scoreProductTitle(cardName: string, title: string): number {
  const query = parseCardSearchQuery(cardName);
  if (!query) return 0;

  const [, number, pack] = CARD_CODE_PATTERN.exec(cardName) ?? [];
  let score = 0;

  if (number && title.includes(`〈${number}〉`)) score += 50;
  if (pack && title.includes(`[${pack}]`)) score += 50;

  const cardBaseName = cardName.split("〈")[0]?.trim() ?? "";
  if (cardBaseName && title.startsWith(cardBaseName)) score += 20;

  if (!cardName.includes("PSA") && /PSA\d*/i.test(title)) score -= 40;
  if (!cardName.includes("未開封") && title.includes("未開封")) score -= 30;
  if (title.includes("【")) score -= 10;

  return score;
}

async function searchProductIds(query: string): Promise<string[]> {
  const url = `https://www.hareruya2.com/search?${new URLSearchParams({
    q: query,
    type: "product",
  })}`;

  const html = await fetchText(url);
  const ids = [...html.matchAll(/\/products\/(\d{10,})/g)].map((match) => match[1]);
  return [...new Set(ids)].slice(0, 8);
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

export async function fetchCardImage(cardName: string): Promise<CardImageResult> {
  const cached = cache.get(cardName);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }

  const searchQuery = parseCardSearchQuery(cardName);
  if (!searchQuery) {
    const result: CardImageResult = {
      imageUrl: null,
      productTitle: null,
      searchQuery: null,
      productId: null,
      cached: false,
    };
    return result;
  }

  const productIds = await searchProductIds(searchQuery);
  const candidates = await Promise.all(
    productIds.map(async (productId) => {
      const product = await fetchProduct(productId);
      if (!product) return null;

      return {
        productId,
        title: product.title,
        imageUrl: product.imageUrl,
        score: scoreProductTitle(cardName, product.title),
      };
    }),
  );

  let best: (typeof candidates)[number] = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }

  const result: CardImageResult = {
    imageUrl: best?.imageUrl ?? null,
    productTitle: best?.title ?? null,
    searchQuery,
    productId: best?.productId ?? null,
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
