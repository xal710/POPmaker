import type { ComparisonData, ComparisonItem } from "../types";
import { extractHareruyaRarityFromTitle } from "../../shared/hareruyaRarity";

export function isMatchedItem(item: ComparisonItem): boolean {
  return item.matched;
}

export function mergeComparisonItems(data: ComparisonData | null): ComparisonItem[] {
  if (!data) return [];

  const matched: ComparisonItem[] = data.items.map((item, index) => ({
    id: index,
    name: item.name,
    hareruyaTitle: item.hareruyaTitle,
    rarity:
      item.rarity ??
      (item.hareruyaTitle ? extractHareruyaRarityFromTitle(item.hareruyaTitle) ?? undefined : undefined),
    hareruya2: item.hareruya2,
    cardrush: item.cardrush,
    diff: item.diff,
    series: item.series,
    matched: item.matched ?? true,
    hareruyaSellPrice: item.hareruyaSellPrice,
    hareruyaSeriesName: item.hareruyaSeriesName,
    officialBuyListVisible: item.officialBuyListVisible,
  }));

  const unmatched: ComparisonItem[] = (data.unmatchedHareruya ?? []).map((item, index) => ({
    id: matched.length + index,
    name: item.name,
    hareruyaTitle: item.hareruyaTitle,
    rarity:
      item.rarity ??
      (item.hareruyaTitle ? extractHareruyaRarityFromTitle(item.hareruyaTitle) ?? undefined : undefined),
    hareruya2: item.hareruya2,
    cardrush: null,
    diff: null,
    series: item.series,
    matched: false,
    hareruyaSellPrice: item.hareruyaSellPrice,
    hareruyaSeriesName: item.hareruyaSeriesName,
    officialBuyListVisible: item.officialBuyListVisible,
  }));

  return [...matched, ...unmatched];
}

export function countMatchedItems(items: ComparisonItem[]): number {
  return items.filter((item) => item.matched).length;
}

export function countUnmatchedItems(items: ComparisonItem[]): number {
  return items.filter((item) => !item.matched).length;
}
