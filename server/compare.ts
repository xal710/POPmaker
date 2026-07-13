import type { ComparisonItem, HareruyaOnlyItem } from "./excel";
import { isOfficialBuyListVisible } from "../shared/hareruyaBuyListFilter";
import {
  buildCardRushMatchIndex,
  findCardRushMatch,
  hasCardRushModel,
  parseHareruyaIdentity,
} from "./cardMatch";
import type { CardRushRawRow } from "./fetch/cardrush";
import type { HareruyaPriceEntry } from "./normalize";
import { resolveItemSeries } from "./series";

export type { ComparisonItem, HareruyaOnlyItem } from "./excel";

export interface ComparisonBuildResult {
  items: ComparisonItem[];
  unmatchedHareruya: HareruyaOnlyItem[];
}

function buildBuyListMeta(entry: HareruyaPriceEntry) {
  const hareruyaSellPrice = entry.sellPrice;
  const hareruyaSeriesName = entry.seriesName || undefined;
  const officialBuyListVisible = isOfficialBuyListVisible({
    buyPrice: entry.price,
    sellPrice: hareruyaSellPrice,
    seriesName: entry.seriesName,
  });

  return { hareruyaSellPrice, hareruyaSeriesName, officialBuyListVisible };
}

function hasComparableHareruyaModelNumber(modelNumber: string): boolean {
  const trimmed = modelNumber.trim();
  return trimmed !== "" && trimmed !== "-";
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

    const buyListMeta = buildBuyListMeta(entry);

    const match = findCardRushMatch(identity, index);
    if (!match) {
      if (!hasComparableHareruyaModelNumber(identity.modelNumber)) {
        continue;
      }

      if (!hasCardRushModel(index, identity.modelNumber)) {
        continue;
      }

      unmatchedHareruya.push({
        id: unmatchedHareruya.length,
        name: displayName,
        hareruyaTitle: entry.rawName,
        rarity: identity.rarity ?? undefined,
        hareruya2: entry.price,
        hareruyaSourceOrder: entry.sourceOrder,
        series: resolveItemSeries(displayName, entry.series) ?? undefined,
        ...buyListMeta,
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
      hareruyaSourceOrder: entry.sourceOrder,
      series: resolveItemSeries(displayName, entry.series),
      matched: true,
      cardrushOchaProductId: match.ochaProductId ?? undefined,
      ...buyListMeta,
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
