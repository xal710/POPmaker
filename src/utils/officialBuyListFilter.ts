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

/** 晴れる屋2 買取リスト公式サイト（シリーズ=すべて）と同じ表示条件 */
export function passesOfficialBuyListFilter(item: ComparisonItem): boolean {
  if (item.officialBuyListVisible !== undefined) {
    return item.officialBuyListVisible;
  }

  if (item.hareruyaSellPrice === undefined && !item.hareruyaSeriesName) {
    return true;
  }

  return isOfficialBuyListVisible(toOfficialBuyListFilterInput(item));
}

export function filterToOfficialBuyList(items: ComparisonItem[]): ComparisonItem[] {
  return items.filter((item) => passesOfficialBuyListFilter(item));
}
