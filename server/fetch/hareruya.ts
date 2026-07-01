import { HARERUYA_BUY_LIST_PAGES } from "../../shared/hareruyaBuyListPages";
import type { CardSeries } from "../series";
import {
  fetchBuyListUpdatedAtFromPage,
  getBuyListUpdatedAtDate,
  loadHareruyaCatalog,
  mapSeriesNameToCardSeries,
  type HareruyaCatalogProduct,
} from "./hareruyaCatalog";

export {
  BUY_LIST_UPDATED_AT_PATTERN,
  CARD_LINE_PATTERN,
  HARERUYA_BUY_LIST_PAGE_URL,
  HARERUYA_PRODUCTS_ALL_JSON_URL,
  getBuyListUpdatedAtDate,
  loadHareruyaCatalog,
  parseBuyListUpdatedAt,
} from "./hareruyaCatalog";

export interface RawPriceRow {
  name: string;
  price: number;
  series: CardSeries | null;
  imageUrl: string | null;
  productId: number | null;
}

export interface HareruyaBuyListFetchResult {
  rows: RawPriceRow[];
  pageUpdatedAt: Partial<Record<string, string>>;
}

function catalogProductToRow(product: HareruyaCatalogProduct): RawPriceRow {
  return {
    name: product.title,
    price: product.buy_price,
    series: mapSeriesNameToCardSeries(product.series_name),
    imageUrl: product.image_url,
    productId: product.id,
  };
}

function buildPageUpdatedAt(updatedAt: string): Partial<Record<string, string>> {
  const pageUpdatedAt: Partial<Record<string, string>> = {
    "buying-list": updatedAt,
  };

  for (const page of HARERUYA_BUY_LIST_PAGES) {
    pageUpdatedAt[page.slug] = updatedAt;
  }

  return pageUpdatedAt;
}

export async function fetchHareruyaBuyPrices(
  onProgress?: (message: string) => void,
): Promise<HareruyaBuyListFetchResult> {
  onProgress?.("晴れる屋2: 買取リストを取得中...");

  const [products, updatedAt] = await Promise.all([
    loadHareruyaCatalog({ onProgress }),
    fetchBuyListUpdatedAtFromPage(),
  ]);

  const rows = products.map(catalogProductToRow);
  const resolvedUpdatedAt = updatedAt ?? getBuyListUpdatedAtDate();

  onProgress?.(`晴れる屋2: ${rows.length.toLocaleString("ja-JP")}件を取得しました`);

  return {
    rows,
    pageUpdatedAt: buildPageUpdatedAt(resolvedUpdatedAt),
  };
}

/** @deprecated 旧7ページHTML方式。互換のため定数のみ残す */
export const HARERUYA_BUY_LIST_URLS = [
  "https://www.hareruya2.com/pages/buying-list",
] as const;

export function parseHareruyaBuyListHtml(_html: string): RawPriceRow[] {
  return [];
}
