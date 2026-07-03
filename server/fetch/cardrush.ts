import { fetchText } from "./http";
import {
  canReuseSnapshot,
  isCardRushSnapshotCacheEnabled,
  loadCardRushSnapshot,
  saveCardRushSnapshot,
  type CardRushSnapshot,
} from "./cardrushSnapshot";
import type { CardRushRawRow } from "./cardrushTypes";

export type { CardRushRawRow } from "./cardrushTypes";
export type { CardRushSnapshot } from "./cardrushSnapshot";
export { isCardRushSnapshotCacheEnabled } from "./cardrushSnapshot";

interface NextBuyingPage {
  buyingPrices: Array<{
    name: string;
    pack_code: string | null;
    rarity: string | null;
    model_number: string | null;
    amount: number;
    extra_difference: string | null;
  }>;
  lastPage: number;
  updatedAt?: string;
}

const BASE_URL = "https://cardrush.media/pokemon/buying_prices";
const PAGE_FETCH_CONCURRENCY = 6;

function appendPageRows(rows: CardRushRawRow[], pageData: NextBuyingPage): void {
  for (const item of pageData.buyingPrices) {
    rows.push({
      name: item.name,
      pack: item.pack_code,
      rarity: item.rarity,
      modelNumber: item.model_number,
      price: item.amount,
      extraDifference: item.extra_difference,
    });
  }
}

async function fetchCardRushPage(page: number): Promise<NextBuyingPage> {
  const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
  const html = await fetchText(url);
  return extractNextData(html);
}

async function fetchCardRushPages(
  lastPage: number,
  onProgress?: (message: string) => void,
): Promise<CardRushRawRow[]> {
  const rows: CardRushRawRow[] = [];

  if (lastPage <= 1) {
    return rows;
  }

  for (let start = 2; start <= lastPage; start += PAGE_FETCH_CONCURRENCY) {
    const pages = Array.from(
      { length: Math.min(PAGE_FETCH_CONCURRENCY, lastPage - start + 1) },
      (_, index) => start + index,
    );

    onProgress?.(
      `カードラッシュ: ${pages[0]}-${pages[pages.length - 1]}/${lastPage} ページを取得中...`,
    );

    const pageResults = await Promise.all(pages.map((page) => fetchCardRushPage(page)));
    for (const pageData of pageResults) {
      appendPageRows(rows, pageData);
    }
  }

  return rows;
}

function extractNextData(html: string): NextBuyingPage {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("カードラッシュのデータを読み取れませんでした");
  }

  const data = JSON.parse(match[1]) as {
    props: { pageProps: NextBuyingPage };
  };

  return data.props.pageProps;
}

function buildSnapshot(
  rows: CardRushRawRow[],
  firstPage: NextBuyingPage,
  updatedAt: string,
): CardRushSnapshot {
  return {
    updatedAt,
    lastPage: firstPage.lastPage,
    rowCount: rows.length,
    fetchedAt: new Date().toISOString(),
    rows,
  };
}

export interface CardRushCatalogMeta {
  updatedAt: string | null;
  lastPage: number;
}

export async function fetchCardRushCatalogMeta(): Promise<CardRushCatalogMeta> {
  const firstPage = await fetchCardRushPage(1);
  return {
    updatedAt: firstPage.updatedAt ?? null,
    lastPage: firstPage.lastPage,
  };
}

export async function fetchCardRushBuyPrices(
  onProgress?: (message: string) => void,
): Promise<{
  rows: CardRushRawRow[];
  updatedAt: string | null;
  lastPage: number;
  fromCache: boolean;
}> {
  onProgress?.("カードラッシュ: 1 ページ目を取得中...");
  const firstPage = await fetchCardRushPage(1);
  const lastPage = firstPage.lastPage;
  const updatedAt = firstPage.updatedAt ?? null;

  const cached = loadCardRushSnapshot();
  if (cached && updatedAt && canReuseSnapshot({ updatedAt, lastPage }, cached)) {
    onProgress?.(
      `カードラッシュ: キャッシュを使用（${cached.rowCount.toLocaleString("ja-JP")}件 / CR更新 ${updatedAt}）`,
    );
    return { rows: cached.rows, updatedAt, lastPage, fromCache: true };
  }

  const rows: CardRushRawRow[] = [];
  appendPageRows(rows, firstPage);

  const restRows = await fetchCardRushPages(lastPage, onProgress);
  rows.push(...restRows);

  if (updatedAt && isCardRushSnapshotCacheEnabled()) {
    saveCardRushSnapshot(buildSnapshot(rows, firstPage, updatedAt));
  }

  return { rows, updatedAt, lastPage, fromCache: false };
}
