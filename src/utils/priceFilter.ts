import type { ComparisonItem } from "../types";

export type DiffSignFilter = "all" | "positive" | "negative";

export interface PriceFilterState {
  diffSign: DiffSignFilter;
  diffMin: string;
  diffMax: string;
  hareruyaMin: string;
  hareruyaMax: string;
  cardrushMin: string;
  cardrushMax: string;
}

export const DEFAULT_PRICE_FILTER: PriceFilterState = {
  diffSign: "all",
  diffMin: "",
  diffMax: "",
  hareruyaMin: "",
  hareruyaMax: "",
  cardrushMin: "",
  cardrushMax: "",
};

function parseBound(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function withinRange(value: number, min: number | null, max: number | null): boolean {
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

export function isPriceFilterActive(filter: PriceFilterState): boolean {
  return (
    filter.diffSign !== "all" ||
    filter.diffMin.trim() !== "" ||
    filter.diffMax.trim() !== "" ||
    filter.hareruyaMin.trim() !== "" ||
    filter.hareruyaMax.trim() !== "" ||
    filter.cardrushMin.trim() !== "" ||
    filter.cardrushMax.trim() !== ""
  );
}

export function applyPriceFilter(
  items: ComparisonItem[],
  filter: PriceFilterState,
): ComparisonItem[] {
  if (!isPriceFilterActive(filter)) return items;

  const diffMin = parseBound(filter.diffMin);
  const diffMax = parseBound(filter.diffMax);
  const hareruyaMin = parseBound(filter.hareruyaMin);
  const hareruyaMax = parseBound(filter.hareruyaMax);
  const cardrushMin = parseBound(filter.cardrushMin);
  const cardrushMax = parseBound(filter.cardrushMax);

  return items.filter((item) => {
    if (!item.matched) {
      if (filter.diffSign !== "all") return false;
      if (filter.diffMin.trim() || filter.diffMax.trim()) return false;
      if (filter.cardrushMin.trim() || filter.cardrushMax.trim()) return false;
      return withinRange(item.hareruya2, hareruyaMin, hareruyaMax);
    }

    if (filter.diffSign === "positive" && (item.diff ?? 0) <= 0) return false;
    if (filter.diffSign === "negative" && (item.diff ?? 0) >= 0) return false;

    if (item.diff !== null && !withinRange(item.diff, diffMin, diffMax)) return false;
    if (!withinRange(item.hareruya2, hareruyaMin, hareruyaMax)) return false;
    if (item.cardrush !== null && !withinRange(item.cardrush, cardrushMin, cardrushMax)) {
      return false;
    }

    return true;
  });
}

export function countActivePriceFilters(filter: PriceFilterState): number {
  let count = 0;
  if (filter.diffSign !== "all") count += 1;
  if (filter.diffMin.trim() || filter.diffMax.trim()) count += 1;
  if (filter.hareruyaMin.trim() || filter.hareruyaMax.trim()) count += 1;
  if (filter.cardrushMin.trim() || filter.cardrushMax.trim()) count += 1;
  return count;
}
