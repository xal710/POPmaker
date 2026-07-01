import {
  isOfficialBuyListVisible,
  type OfficialBuyListFilterInput,
} from "../../shared/hareruyaBuyListFilter";
import type { ComparisonItem } from "../types";

export function toOfficialBuyListFilterInput(item: ComparisonItem): OfficialBuyListFilterInput {
  return {
    buyPrice: item.hareruya2,
    sellPrice: item.hareruyaSellPrice ?? 0,
    seriesName: item.hareruyaSeriesName ?? null,
  };
}

/** 公式サイト準拠の表示（高額込み OFF） */
export function passesOfficialBuyListFilter(item: ComparisonItem): boolean {
  if (item.officialBuyListVisible !== undefined) {
    return item.officialBuyListVisible;
  }

  if (item.hareruyaSellPrice === undefined && !item.hareruyaSeriesName) {
    return true;
  }

  return isOfficialBuyListVisible(toOfficialBuyListFilterInput(item));
}

export function applyOfficialBuyListFilter(
  items: ComparisonItem[],
  includeHighValue: boolean,
): ComparisonItem[] {
  if (includeHighValue) return items;
  return items.filter((item) => passesOfficialBuyListFilter(item));
}

export function countOfficialBuyListHidden(items: ComparisonItem[]): number {
  return items.filter((item) => !passesOfficialBuyListFilter(item)).length;
}
