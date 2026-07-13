import { fetchText, parsePrice, sleep } from "./http";

const PRODUCT_BASE_URL = "https://www.cardrush-pokemon.jp/product";
const FETCH_CONCURRENCY = 6;
const FETCH_DELAY_MS = 80;

const sellPriceCache = new Map<number, number | null>();

export function parseCardRushSellPriceFromHtml(html: string): number | null {
  const match = html.match(/id="pricech">([0-9,]+)円/);
  if (!match) return null;
  return parsePrice(match[1]);
}

export async function fetchCardRushSellPrice(productId: number): Promise<number | null> {
  if (sellPriceCache.has(productId)) {
    return sellPriceCache.get(productId) ?? null;
  }

  const html = await fetchText(`${PRODUCT_BASE_URL}/${productId}`);
  const price = parseCardRushSellPriceFromHtml(html);
  sellPriceCache.set(productId, price);
  return price;
}

export function clearCardRushSellPriceCache(): void {
  sellPriceCache.clear();
}

export async function fetchCardRushSellPrices(
  productIds: number[],
  onProgress?: (message: string) => void,
): Promise<Map<number, number>> {
  const unique = [...new Set(productIds.filter((id) => id > 0))];
  const result = new Map<number, number>();
  if (unique.length === 0) return result;

  let completed = 0;

  for (let start = 0; start < unique.length; start += FETCH_CONCURRENCY) {
    const batch = unique.slice(start, start + FETCH_CONCURRENCY);
    onProgress?.(
      `カードラッシュ販売価格: ${completed.toLocaleString("ja-JP")}/${unique.length.toLocaleString("ja-JP")} 件を取得中...`,
    );

    const batchResults = await Promise.all(
      batch.map(async (productId) => {
        try {
          const price = await fetchCardRushSellPrice(productId);
          return { productId, price };
        } catch {
          return { productId, price: null };
        }
      }),
    );

    for (const { productId, price } of batchResults) {
      if (price != null) {
        result.set(productId, price);
      }
    }

    completed += batch.length;
    if (start + FETCH_CONCURRENCY < unique.length) {
      await sleep(FETCH_DELAY_MS);
    }
  }

  onProgress?.(
    `カードラッシュ販売価格: ${result.size.toLocaleString("ja-JP")}/${unique.length.toLocaleString("ja-JP")} 件を取得しました`,
  );

  return result;
}
