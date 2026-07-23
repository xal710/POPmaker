import type { ComparisonItem } from "./excel";
import { fetchCardRushSellPrices, type CardrushSellFetchStats } from "./fetch/cardrushSell";
import { getCachedCardRushSellPrice } from "./fetch/cardrushSellCache";

function applySellPricesToItems(items: ComparisonItem[]): ComparisonItem[] {
  return items.map((item) => {
    const productId = item.cardrushOchaProductId;
    if (!productId) return item;

    const cached = getCachedCardRushSellPrice(productId);
    if (cached !== undefined) {
      return { ...item, cardrushSellPrice: cached };
    }

    // 未取得のカードは明示的 null にせず、既存値があれば維持
    if (item.cardrushSellPrice != null) {
      return item;
    }

    if ("cardrushSellPrice" in item) {
      const { cardrushSellPrice: _removed, ...rest } = item;
      return rest;
    }

    return item;
  });
}

export async function enrichComparisonWithCardRushSellPrices(
  items: ComparisonItem[],
  onProgress?: (message: string) => void,
  options?: {
    buyListUpdatedAt?: string | null;
    onStats?: (stats: CardrushSellFetchStats) => void;
    onPartial?: (items: ComparisonItem[]) => void;
  },
): Promise<ComparisonItem[]> {
  const productIds = items
    .map((item) => item.cardrushOchaProductId)
    .filter((id): id is number => typeof id === "number" && id > 0);

  if (productIds.length === 0) {
    return items;
  }

  await fetchCardRushSellPrices(productIds, onProgress, {
    buyListUpdatedAt: options?.buyListUpdatedAt ?? null,
    onStats: (stats) => {
      options?.onStats?.(stats);
      options?.onPartial?.(applySellPricesToItems(items));
    },
  });

  return applySellPricesToItems(items);
}
