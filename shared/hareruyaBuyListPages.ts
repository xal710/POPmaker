export const HARERUYA_BUY_LIST_PAGE_URL = "https://www.hareruya2.com/pages/buying-list";

/**
 * 買取リストページのシリーズ絞り込み（「すべて」選択時）に表示されるシリーズ。
 * buying-list のプルダウンと同一。
 */
export const HARERUYA_BUY_LIST_SERIES_NAMES = [
  "MEGAシリーズ",
  "スカーレット&バイオレットシリーズ",
  "ソード&シールドシリーズ",
  "サン&ムーンシリーズ",
  "XYシリーズ",
  "BWシリーズ",
] as const;

const BUY_LIST_SERIES_SET = new Set<string>(
  HARERUYA_BUY_LIST_SERIES_NAMES.map((name) => name.replace(/＆/g, "&")),
);

/** 買取リスト「すべて」タブに掲載されるシリーズか（ADV/neo 等は JSON にあっても非表示） */
export function isHareruyaBuyListListedSeries(seriesName: string | null | undefined): boolean {
  if (!seriesName) return false;
  return BUY_LIST_SERIES_SET.has(seriesName.replace(/＆/g, "&").trim());
}

/** ヘッダー表示用ラベル（データは buying-list の単一JSONから取得） */
export const HARERUYA_BUY_LIST_PAGES = [
  { slug: "buying-list-kyouka", label: "強化", title: "強化買取リスト" },
  { slug: "buying-list-mega", label: "M", title: "MEGAシリーズ" },
  { slug: "buying-list-sv", label: "SV", title: "スカーレット&バイオレット" },
  { slug: "buying-list-ss", label: "S", title: "ソード＆シールドシリーズ" },
  { slug: "buying-list-sm", label: "SM", title: "サン&ムーンシリーズ" },
  { slug: "buying-list-xy", label: "XY", title: "XYシリーズ" },
  { slug: "buying-list-bw", label: "BW", title: "BWシリーズ" },
] as const;

export type HareruyaBuyListPageSlug = (typeof HARERUYA_BUY_LIST_PAGES)[number]["slug"];

/** YYYY-MM-DD または YYYYMMDD を mm/dd に変換 */
export function formatBuyListDateMmDd(value: string | null | undefined): string {
  if (!value) return "—";

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}`;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(4, 6)}/${value.slice(6, 8)}`;
  }

  return value;
}
