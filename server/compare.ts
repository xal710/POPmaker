import type { ComparisonItem } from "./excel";
import {
  cardrushLookupKey,
  resolveCardRushPrice,
  type CardRushPriceBucket,
} from "./normalize";
import { resolveItemSeries, type CardSeries } from "./series";

/**
 * 晴れる屋2を基準にカードラッシュ価格を突合する。
 * 同一型番でもミラー/通常は別価格として扱い、誤った価格帯での比較を避ける。
 */
export function buildComparisonItems(
  hareruya: Map<string, { price: number; series: CardSeries | null }>,
  cardrush: Map<string, CardRushPriceBucket>,
): ComparisonItem[] {
  const items: ComparisonItem[] = [];

  for (const [name, entry] of hareruya) {
    const bucket = cardrush.get(cardrushLookupKey(name));
    if (!bucket) continue;

    const cardrushPrice = resolveCardRushPrice(name, bucket);
    if (cardrushPrice === undefined) continue;

    items.push({
      id: items.length,
      name,
      cardrush: cardrushPrice,
      hareruya2: entry.price,
      diff: entry.price - cardrushPrice,
      series: resolveItemSeries(name, entry.series),
    });
  }

  items.sort((a, b) => b.diff - a.diff);
  return items.map((item, index) => ({ ...item, id: index }));
}
