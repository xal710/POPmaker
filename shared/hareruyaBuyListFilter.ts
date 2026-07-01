/** 晴れる屋2 買取リスト（公式サイト）の「すべて」表示と同じシリーズ候補 */
export const OFFICIAL_BUY_LIST_SERIES_NAMES = [
  "MEGAシリーズ",
  "スカーレット&バイオレットシリーズ",
  "ソード&シールドシリーズ",
  "サン&ムーンシリーズ",
  "XYシリーズ",
  "BWシリーズ",
] as const;

export const HARERUYA_MIN_BUY_PRICE = 50;
export const HARERUYA_HIGH_VALUE_SELL_PRICE_THRESHOLD = 500_000;

const NORMALIZED_OFFICIAL_SERIES = new Set(
  OFFICIAL_BUY_LIST_SERIES_NAMES.map((name) => normalizeHareruyaSeriesName(name)),
);

export function normalizeHareruyaSeriesName(value: string): string {
  return value.replace(/＆/g, "&").trim();
}

export interface OfficialBuyListFilterInput {
  buyPrice: number;
  sellPrice: number;
  seriesName?: string | null;
}

/** 晴れる屋2 買取リスト公式サイト（シリーズ=すべて）と同じ表示条件 */
export function isOfficialBuyListVisible(input: OfficialBuyListFilterInput): boolean {
  const buyPrice = Number(input.buyPrice) || 0;
  const sellPrice = Number(input.sellPrice) || 0;

  if (buyPrice < HARERUYA_MIN_BUY_PRICE) return false;
  if (sellPrice >= HARERUYA_HIGH_VALUE_SELL_PRICE_THRESHOLD) return false;

  const seriesName = normalizeHareruyaSeriesName(input.seriesName ?? "");
  if (!seriesName) return false;

  return NORMALIZED_OFFICIAL_SERIES.has(seriesName);
}

export function isHighValueBuyListItem(sellPrice: number): boolean {
  return (Number(sellPrice) || 0) >= HARERUYA_HIGH_VALUE_SELL_PRICE_THRESHOLD;
}
