import { fetchText } from "./http";
import { normalizeImageLookupKey } from "../normalize";
import type { CardSeries } from "../series";

export const HARERUYA_BUY_LIST_PAGE_URL = "https://www.hareruya2.com/pages/buying-list";

export const HARERUYA_PRODUCTS_ALL_JSON_URL =
  "https://api.corp.hareruyamtg.com/user_data/hareruya2/json/products_all.json";

export const CARD_LINE_PATTERN = /〈[^〉]+〉/;

const SERIES_NAME_TO_CARD_SERIES: Record<string, CardSeries> = {
  "MEGAシリーズ": "M",
  "スカーレット&バイオレットシリーズ": "SV",
  "ソード&シールドシリーズ": "S",
  "サン&ムーンシリーズ": "SM",
  "XYシリーズ": "XY",
  "BWシリーズ": "BW",
};

export interface HareruyaCatalogProduct {
  id: number;
  title: string;
  image_url: string | null;
  series_name: string;
  set_name: string;
  collection_number: string;
  sell_price: number;
  buy_price: number;
  is_pickup: boolean;
}

interface HareruyaCatalogResponse {
  count?: number;
  products?: HareruyaCatalogProduct[];
}

interface CatalogCache {
  products: HareruyaCatalogProduct[];
  byLookupKey: Map<string, HareruyaCatalogProduct[]>;
  loadedAt: number;
}

const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;
let catalogCache: CatalogCache | null = null;

function normalizeSeriesName(value: string): string {
  return value.replace(/＆/g, "&").trim();
}

export function mapSeriesNameToCardSeries(seriesName: string | null | undefined): CardSeries | null {
  if (!seriesName) return null;
  return SERIES_NAME_TO_CARD_SERIES[normalizeSeriesName(seriesName)] ?? null;
}

/** 買取リストページと同じ表示日（JSTの当日） */
export function getBuyListUpdatedAtDate(now = new Date()): string {
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isVisibleBuyListProduct(product: HareruyaCatalogProduct): boolean {
  const buyPrice = product.buy_price ?? 0;
  const sellPrice = product.sell_price ?? 0;
  if (buyPrice < 50) return false;
  if (sellPrice >= 500000) return false;
  if (!CARD_LINE_PATTERN.test(product.title)) return false;
  return true;
}

function buildLookupIndex(products: HareruyaCatalogProduct[]): Map<string, HareruyaCatalogProduct[]> {
  const byLookupKey = new Map<string, HareruyaCatalogProduct[]>();

  for (const product of products) {
    const key = normalizeImageLookupKey(product.title);
    const bucket = byLookupKey.get(key);
    if (bucket) {
      bucket.push(product);
    } else {
      byLookupKey.set(key, [product]);
    }
  }

  return byLookupKey;
}

function parseCatalogProduct(raw: unknown): HareruyaCatalogProduct | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) return null;

  return {
    id: typeof record.id === "number" ? record.id : Number(record.id ?? 0),
    title,
    image_url: typeof record.image_url === "string" ? record.image_url : null,
    series_name: typeof record.series_name === "string" ? record.series_name : "",
    set_name: typeof record.set_name === "string" ? record.set_name : "",
    collection_number:
      typeof record.collection_number === "string" ? record.collection_number : "",
    sell_price: Number(record.sell_price ?? 0),
    buy_price: Number(record.buy_price ?? 0),
    is_pickup: record.is_pickup === true,
  };
}

export async function loadHareruyaCatalog(options?: {
  force?: boolean;
  onProgress?: (message: string) => void;
}): Promise<HareruyaCatalogProduct[]> {
  if (
    !options?.force &&
    catalogCache &&
    Date.now() - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS
  ) {
    return catalogCache.products;
  }

  options?.onProgress?.("晴れる屋2: 買取リストJSONを取得中...");

  const response = await fetch(HARERUYA_PRODUCTS_ALL_JSON_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${HARERUYA_PRODUCTS_ALL_JSON_URL}`);
  }

  const data = (await response.json()) as HareruyaCatalogResponse;
  const products = (data.products ?? [])
    .map(parseCatalogProduct)
    .filter((product): product is HareruyaCatalogProduct => product !== null)
    .filter(isVisibleBuyListProduct);

  catalogCache = {
    products,
    byLookupKey: buildLookupIndex(products),
    loadedAt: Date.now(),
  };

  return products;
}

export function findCatalogProductByCardName(cardName: string): HareruyaCatalogProduct | null {
  if (!catalogCache) return null;

  const key = normalizeImageLookupKey(cardName);
  const matches = catalogCache.byLookupKey.get(key);
  if (!matches || matches.length === 0) return null;

  return matches.reduce((best, current) => {
    if (!best) return current;
    if ((current.buy_price ?? 0) > (best.buy_price ?? 0)) return current;
    return best;
  });
}

export function clearHareruyaCatalogCache(): void {
  catalogCache = null;
}

/** @deprecated 旧HTML買取表向け。新サイトでは getBuyListUpdatedAtDate を使用 */
export const BUY_LIST_UPDATED_AT_PATTERN = /更新日時:\s*(\d{4})\/(\d{2})\/(\d{2})/;

export function parseBuyListUpdatedAt(html: string): string | null {
  const match = BUY_LIST_UPDATED_AT_PATTERN.exec(html);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function fetchBuyListUpdatedAtFromPage(): Promise<string | null> {
  try {
    const html = await fetchText(HARERUYA_BUY_LIST_PAGE_URL);
    return parseBuyListUpdatedAt(html) ?? getBuyListUpdatedAtDate();
  } catch {
    return getBuyListUpdatedAtDate();
  }
}
