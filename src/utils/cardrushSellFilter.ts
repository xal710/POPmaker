import type { ComparisonItem } from "../types";

export type CardrushSellFilter = "all" | "withSell";

export const DEFAULT_CARDRUSH_SELL_FILTER: CardrushSellFilter = "all";

export const CARDRUSH_SELL_FILTER_LABELS: Record<CardrushSellFilter, string> = {
  all: "すべて",
  withSell: "CR販売比較可",
};

export function hasCardrushSellComparison(item: ComparisonItem): boolean {
  return item.matched && item.cardrushSellPrice != null;
}

export function isCardrushSellFilterActive(filter: CardrushSellFilter): boolean {
  return filter !== DEFAULT_CARDRUSH_SELL_FILTER;
}

export function applyCardrushSellFilter(
  items: ComparisonItem[],
  filter: CardrushSellFilter,
): ComparisonItem[] {
  if (filter === "all") return items;
  return items.filter((item) => hasCardrushSellComparison(item));
}

export interface CardrushSellComparisonStats {
  /** 比較済み（CR販売取得の対象） */
  targetCount: number;
  /** CR販売価格が付いている件数 */
  withSellPriceCount: number;
}

export function countCardrushSellComparison(items: ComparisonItem[]): CardrushSellComparisonStats {
  const matched = items.filter((item) => item.matched);
  const withSellPriceCount = matched.filter((item) => item.cardrushSellPrice != null).length;
  return {
    targetCount: matched.length,
    withSellPriceCount,
  };
}
