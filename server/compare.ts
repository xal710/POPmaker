import type { ComparisonItem } from "./excel";
import {
  buildCardRushMatchIndex,
  findCardRushMatch,
  parseHareruyaIdentity,
} from "./cardMatch";
import type { CardRushRawRow } from "./fetch/cardrush";
import type { HareruyaPriceEntry } from "./normalize";
import { resolveItemSeries } from "./series";

/**
 * 晴れる屋2を基準にカードラッシュ価格を突合する。
 * 型番・カード名（大小文字区別）・ミラー種別・レアリティで構造化照合する。
 */
export function buildComparisonItems(
  hareruya: Map<string, HareruyaPriceEntry>,
  cardrushRows: CardRushRawRow[],
): ComparisonItem[] {
  const index = buildCardRushMatchIndex(cardrushRows);
  const items: ComparisonItem[] = [];

  for (const [displayName, entry] of hareruya) {
    const identity = parseHareruyaIdentity(entry.rawName);
    if (!identity) continue;

    const match = findCardRushMatch(identity, index);
    if (!match) continue;

    items.push({
      id: items.length,
      name: displayName,
      cardrush: match.price,
      hareruya2: entry.price,
      diff: entry.price - match.price,
      series: resolveItemSeries(displayName, entry.series),
    });
  }

  items.sort((a, b) => b.diff - a.diff);
  return items.map((item, index) => ({ ...item, id: index }));
}
