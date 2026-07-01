import type { ComparisonItem } from "../types";

export type ComparisonSortKey = "cardrush" | "hareruya2" | "diff";
export type SortDirection = "asc" | "desc";

export interface ComparisonSortState {
  key: ComparisonSortKey;
  direction: SortDirection;
}

export const DEFAULT_COMPARISON_SORT: ComparisonSortState = {
  key: "diff",
  direction: "desc",
};

export const COMPARISON_SORT_LABELS: Record<ComparisonSortKey, string> = {
  cardrush: "カードラッシュ",
  hareruya2: "晴れる屋2",
  diff: "差額",
};

function sortValue(item: ComparisonItem, key: ComparisonSortKey): number {
  const value = item[key];
  if (value === null) return Number.NEGATIVE_INFINITY;
  return value;
}

export function sortComparisonItems(
  items: ComparisonItem[],
  sort: ComparisonSortState,
): ComparisonItem[] {
  const factor = sort.direction === "desc" ? -1 : 1;

  return [...items].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    if (left !== right) return (left - right) * factor;
    return a.id - b.id;
  });
}

export function toggleComparisonSort(
  current: ComparisonSortState,
  key: ComparisonSortKey,
): ComparisonSortState {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "desc" ? "asc" : "desc",
    };
  }

  return { key, direction: "desc" };
}

export function getComparisonSortArrow(
  sort: ComparisonSortState,
  key: ComparisonSortKey,
): string {
  if (sort.key !== key) return "";
  return sort.direction === "desc" ? "↓" : "↑";
}
