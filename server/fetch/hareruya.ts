import { fetchText, htmlToLines, parsePrice } from "./http";
import { HARERUYA_URL_SERIES, type CardSeries } from "../series";

export const BUY_LIST_UPDATED_AT_PATTERN = /更新日時:\s*(\d{4})\/(\d{2})\/(\d{2})/;

export const HARERUYA_BUY_LIST_URLS = [
  "https://www.hareruya2.com/pages/buying-list-kyouka",
  "https://www.hareruya2.com/pages/buying-list-mega",
  "https://www.hareruya2.com/pages/buying-list-sv",
  "https://www.hareruya2.com/pages/buying-list-ss",
  "https://www.hareruya2.com/pages/buying-list-sm",
  "https://www.hareruya2.com/pages/buying-list-xy",
  "https://www.hareruya2.com/pages/buying-list-bw",
] as const;

export interface RawPriceRow {
  name: string;
  price: number;
  series: CardSeries | null;
}

export interface HareruyaBuyListFetchResult {
  rows: RawPriceRow[];
  pageUpdatedAt: Partial<Record<string, string>>;
}

/** 晴れる屋2 買取表HTMLから「更新日時: YYYY/MM/DD」を抽出 */
export function parseBuyListUpdatedAt(html: string): string | null {
  const match = BUY_LIST_UPDATED_AT_PATTERN.exec(html);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

const CARD_LINE_PATTERN = /〈[^〉]+〉/;

export function parseHareruyaBuyListHtml(html: string): RawPriceRow[] {
  const lines = htmlToLines(html);
  const rows: RawPriceRow[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!CARD_LINE_PATTERN.test(line)) continue;
    if (line.includes("買取価格") || line.includes("カード名")) continue;

    const nextLine = lines[index + 1];
    const price = nextLine ? parsePrice(nextLine) : null;
    if (price === null) continue;

    rows.push({ name: line, price, series: null });
    index += 1;
  }

  return rows;
}

export async function fetchHareruyaBuyPrices(
  onProgress?: (message: string) => void,
): Promise<HareruyaBuyListFetchResult> {
  onProgress?.("晴れる屋2: 買取表を取得中...");

  const pageResults = await Promise.all(
    HARERUYA_BUY_LIST_URLS.map(async (url) => {
      const slug = url.split("/").pop() ?? url;
      const series = HARERUYA_URL_SERIES[slug] ?? null;
      const html = await fetchText(url);
      const updatedAt = parseBuyListUpdatedAt(html);
      const rows = parseHareruyaBuyListHtml(html).map((row) => ({ ...row, series }));

      return { slug, updatedAt, rows };
    }),
  );

  const pageUpdatedAt: Partial<Record<string, string>> = {};
  const allRows: RawPriceRow[] = [];

  for (const page of pageResults) {
    if (page.updatedAt) {
      pageUpdatedAt[page.slug] = page.updatedAt;
    }
    allRows.push(...page.rows);
  }

  return { rows: allRows, pageUpdatedAt };
}
