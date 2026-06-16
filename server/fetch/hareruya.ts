import { fetchText, htmlToLines, parsePrice } from "./http";
import { HARERUYA_URL_SERIES, type CardSeries } from "../series";

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
): Promise<RawPriceRow[]> {
  const allRows: RawPriceRow[] = [];

  for (const url of HARERUYA_BUY_LIST_URLS) {
    const slug = url.split("/").pop() ?? url;
    const series = HARERUYA_URL_SERIES[slug] ?? null;
    onProgress?.(`晴れる屋2: ${slug} を取得中...`);
    const html = await fetchText(url);
    const rows = parseHareruyaBuyListHtml(html).map((row) => ({ ...row, series }));
    allRows.push(...rows);
  }

  return allRows;
}
