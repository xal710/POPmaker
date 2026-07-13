import type { ComparisonItem } from "./excel";
import { fetchCardRushSellPrices } from "./fetch/cardrushSell";

export async function enrichComparisonWithCardRushSellPrices(
  items: ComparisonItem[],
  onProgress?: (message: string) => void,
): Promise<ComparisonItem[]> {
  const productIds = items
    .map((item) => item.cardrushOchaProductId)
    .filter((id): id is number => typeof id === "number" && id > 0);

  if (productIds.length === 0) {
    return items;
  }

  const sellPrices = await fetchCardRushSellPrices(productIds, onProgress);

  return items.map((item) => {
    const productId = item.cardrushOchaProductId;
    if (!productId) return item;

    const cardrushSellPrice = sellPrices.get(productId) ?? null;
    return { ...item, cardrushSellPrice };
  });
}
