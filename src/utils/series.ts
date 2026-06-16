import type { ComparisonItem } from "../types";
import { parseCardName } from "./search";
import {
  detectSeriesFromPack,
  SERIES_OPTIONS,
  type CardSeries,
} from "../../shared/series";

export { SERIES_OPTIONS, type CardSeries } from "../../shared/series";

export type SeriesFilter = CardSeries | "all";

export const SERIES_LABELS: Record<CardSeries, string> = {
  M: "M",
  SV: "SV",
  S: "S",
  SM: "SM",
  XY: "XY",
  BW: "BW",
};

export function getItemSeries(item: ComparisonItem): CardSeries | null {
  const pack = parseCardName(item.name)?.pack;
  if (pack) {
    const fromPack = detectSeriesFromPack(pack);
    if (fromPack) return fromPack;
  }

  if (item.series) return item.series;

  return null;
}

export function filterBySeries(items: ComparisonItem[], filter: SeriesFilter): ComparisonItem[] {
  if (filter === "all") return items;
  return items.filter((item) => getItemSeries(item) === filter);
}

export function countBySeries(items: ComparisonItem[]): Record<CardSeries, number> {
  const counts = Object.fromEntries(SERIES_OPTIONS.map((key) => [key, 0])) as Record<
    CardSeries,
    number
  >;

  for (const item of items) {
    const series = getItemSeries(item);
    if (series) counts[series] += 1;
  }

  return counts;
}
