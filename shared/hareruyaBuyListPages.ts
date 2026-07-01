export const HARERUYA_BUY_LIST_PAGE_URL = "https://www.hareruya2.com/pages/buying-list";

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
