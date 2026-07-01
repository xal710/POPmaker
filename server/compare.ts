import type { ComparisonItem } from "./excel";
import {
  buildCardRushMatchIndex,
  findCardRushMatch,
  parseHareruyaIdentity,
} from "./cardMatch";
import type { CardRushRawRow } from "./fetch/cardrush";
import type { HareruyaPriceEntry } from "./normalize";
import { resolveItemSeries } from "./series";

export interface HareruyaOnlyItem {
  id: number;
  name: string;
  hareruya2: number;
  series?: ComparisonItem["series"];
  hareruyaTitle?: string;
  rarity?: string;
}

export interface ComparisonBuildResult {
  items: ComparisonItem[];
  unmatchedHareruya: HareruyaOnlyItem[];
}

/**
 * 晴れる屋2を基準にカードラッシュ価格を突合する。
 * 型番・カード名（大小文字区別）・ミラー種別・レアリティで構造化照合する。
 */
export function buildComparisonResult(
  hareruya: Map<string, HareruyaPriceEntry>,
  cardrushRows: CardRushRawRow[],
): ComparisonBuildResult {
  const index = buildCardRushMatchIndex(cardrushRows);
  const items: ComparisonItem[] = [];
  const unmatchedHareruya: HareruyaOnlyItem[] = [];

  for (const [displayName, entry] of hareruya) {
    const identity = parseHareruyaIdentity(entry.rawName);
    if (!identity) continue;

    const match = findCardRushMatch(identity, index);
    if (!match) {
      unmatchedHareruya.push({
        id: unmatchedHareruya.length,
        name: displayName,
        hareruyaTitle: entry.rawName,
        rarity: identity.rarity ?? undefined,
        hareruya2: entry.price,
        series: resolveItemSeries(displayName, entry.series) ?? undefined,
      });
      continue;
    }

    items.push({
      id: items.length,
      name: displayName,
      hareruyaTitle: entry.rawName,
      rarity: identity.rarity ?? undefined,
      cardrush: match.price,
      hareruya2: entry.price,
      diff: entry.price - match.price,
      series: resolveItemSeries(displayName, entry.series),
      matched: true,
    });
  }

  items.sort((a, b) => b.diff - a.diff);
  unmatchedHareruya.sort((a, b) => b.hareruya2 - a.hareruya2);

  return {
    items: items.map((item, index) => ({ ...item, id: index })),
    unmatchedHareruya: unmatchedHareruya.map((item, index) => ({ ...item, id: index })),
  };
}

export function buildComparisonItems(
  hareruya: Map<string, HareruyaPriceEntry>,
  cardrushRows: CardRushRawRow[],
): ComparisonItem[] {
  return buildComparisonResult(hareruya, cardrushRows).items;
}
