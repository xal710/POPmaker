import { buildComparisonResult } from "./compare";
import { saveComparisonSourceWatchState } from "./comparisonSourceWatch";
import { persistComparisonPayload } from "./comparisonBackup";
import { enrichComparisonWithCardRushSellPrices } from "./enrichCardRushSell";
import { readComparisonFromJson, type ComparisonItem, type ComparisonPayload } from "./excel";
import { fetchCardRushBuyPrices } from "./fetch/cardrush";
import { loadCardRushSnapshot } from "./fetch/cardrushSnapshot";
import { clearCardRushSellPriceMemoryCache } from "./fetch/cardrushSell";
import { fetchHareruyaBuyPrices } from "./fetch/hareruya";
import { normalizeHareruyaRows } from "./normalize";

import type { CardrushSellFetchStats } from "./fetch/cardrushSell";

export interface RefreshProgress {
  status: "idle" | "running" | "done" | "error";
  message: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  cardrushSellStats?: CardrushSellFetchStats | null;
}

let progress: RefreshProgress = {
  status: "idle",
  message: "待機中",
  startedAt: null,
  finishedAt: null,
  error: null,
};

let refreshPromise: Promise<ComparisonPayload> | null = null;
let hareruyaWatchPromise: Promise<ComparisonPayload> | null = null;

function updateProgress(patch: Partial<RefreshProgress>): void {
  progress = { ...progress, ...patch };
}

export function getRefreshProgress(): RefreshProgress {
  return progress;
}

export function saveComparisonPayload(payload: ComparisonPayload): void {
  persistComparisonPayload(payload);
}

function mergePreviousCardRushSellPrices(
  items: ComparisonItem[],
  previous: ComparisonItem[] | undefined,
): ComparisonItem[] {
  if (!previous?.length) return items;

  const byOchaId = new Map<number, number | null>();
  const byTitle = new Map<string, number | null>();

  for (const item of previous) {
    if (item.cardrushOchaProductId != null && "cardrushSellPrice" in item) {
      byOchaId.set(item.cardrushOchaProductId, item.cardrushSellPrice ?? null);
    }
    if (item.hareruyaTitle && "cardrushSellPrice" in item) {
      byTitle.set(item.hareruyaTitle, item.cardrushSellPrice ?? null);
    }
  }

  return items.map((item) => {
    const fromOcha =
      item.cardrushOchaProductId != null ? byOchaId.get(item.cardrushOchaProductId) : undefined;
    const fromTitle = item.hareruyaTitle ? byTitle.get(item.hareruyaTitle) : undefined;
    const cardrushSellPrice = fromOcha !== undefined ? fromOcha : fromTitle;
    if (cardrushSellPrice === undefined) return item;
    return { ...item, cardrushSellPrice };
  });
}

function readPreviousComparison(): ComparisonPayload | null {
  try {
    return readComparisonFromJson();
  } catch {
    return null;
  }
}

/**
 * ソース監視用: 晴れる屋2だけ再取得し、カードラッシュ買取はスナップショットを使う。
 * CR販売価格の再クロールはしない。
 */
export async function refreshHareruyaPricesKeepingCardRush(): Promise<ComparisonPayload> {
  if (refreshPromise) {
    return refreshPromise;
  }
  if (hareruyaWatchPromise) {
    return hareruyaWatchPromise;
  }

  hareruyaWatchPromise = (async () => {
    updateProgress({
      status: "running",
      message: "晴れる屋2の買取価格を取得しています...",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    });

    try {
      const hareruyaResult = await fetchHareruyaBuyPrices(
        (message) => updateProgress({ message }),
        { force: true },
      );

      const snapshot = loadCardRushSnapshot();
      const cardrushResult = snapshot
        ? {
            rows: snapshot.rows,
            updatedAt: snapshot.updatedAt,
            lastPage: snapshot.lastPage,
          }
        : await fetchCardRushBuyPrices((message) => updateProgress({ message }));

      updateProgress({ message: "価格を突合・比較しています..." });

      const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
      const { items: comparedItems, unmatchedHareruya } = buildComparisonResult(
        hareruyaMap,
        cardrushResult.rows,
      );

      const previous = readPreviousComparison();
      const items = mergePreviousCardRushSellPrices(comparedItems, previous?.items);

      if (items.length === 0 && unmatchedHareruya.length === 0) {
        throw new Error("比較できるカードが見つかりませんでした。名称マッチングを確認してください。");
      }

      const payload: ComparisonPayload = {
        updatedAt: new Date().toISOString(),
        source: "web",
        excelPath: null,
        excelModifiedAt: null,
        dataDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        hareruyaBuyListUpdatedAt: hareruyaResult.pageUpdatedAt,
        cardRushSourceUpdatedAt: cardrushResult.updatedAt,
        cardRushLastPage: cardrushResult.lastPage,
        unmatchedHareruya,
        items,
        warning: undefined,
      };

      saveComparisonPayload(payload);
      saveComparisonSourceWatchState(
        {
          cardRushUpdatedAt: cardrushResult.updatedAt,
          cardRushLastPage: cardrushResult.lastPage,
          hareruyaUpdatedAt: hareruyaResult.pageUpdatedAt["buying-list"] ?? null,
        },
        { refreshTriggered: true },
      );

      updateProgress({
        status: "done",
        message: `晴れる屋2を更新しました（比較 ${items.length.toLocaleString("ja-JP")}件）`,
        finishedAt: new Date().toISOString(),
        cardrushSellStats: null,
      });

      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新に失敗しました";
      updateProgress({
        status: "error",
        message,
        error: message,
        finishedAt: new Date().toISOString(),
      });
      throw error;
    } finally {
      hareruyaWatchPromise = null;
    }
  })();

  return hareruyaWatchPromise;
}

export async function refreshComparisonFromWeb(): Promise<ComparisonPayload> {
  if (refreshPromise) {
    return refreshPromise;
  }
  if (hareruyaWatchPromise) {
    await hareruyaWatchPromise;
    if (refreshPromise) {
      return refreshPromise;
    }
  }

  refreshPromise = (async () => {
    updateProgress({
      status: "running",
      message: "晴れる屋2の買取価格を取得しています...",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    });

    try {
      updateProgress({ message: "晴れる屋2・カードラッシュの買取価格を取得しています..." });

      const [hareruyaResult, cardrushResult] = await Promise.all([
        fetchHareruyaBuyPrices((message) => {
          updateProgress({ message });
        }),
        fetchCardRushBuyPrices((message) => {
          updateProgress({ message });
        }),
      ]);

      updateProgress({ message: "価格を突合・比較しています..." });

      const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
      const { items: comparedItems, unmatchedHareruya } = buildComparisonResult(
        hareruyaMap,
        cardrushResult.rows,
      );

      clearCardRushSellPriceMemoryCache();
      updateProgress({
        message: "カードラッシュの販売価格を取得しています...",
        cardrushSellStats: null,
      });

      const partialPayloadBase = {
        updatedAt: new Date().toISOString(),
        source: "web" as const,
        excelPath: null,
        excelModifiedAt: null,
        dataDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        hareruyaBuyListUpdatedAt: hareruyaResult.pageUpdatedAt,
        cardRushSourceUpdatedAt: cardrushResult.updatedAt,
        cardRushLastPage: cardrushResult.lastPage,
        unmatchedHareruya,
        warning: undefined,
      };

      const items = await enrichComparisonWithCardRushSellPrices(
        comparedItems,
        (message) => {
          updateProgress({ message });
        },
        {
          buyListUpdatedAt: cardrushResult.updatedAt,
          onStats: (cardrushSellStats) => {
            updateProgress({ cardrushSellStats });
          },
          onPartial: (partialItems) => {
            saveComparisonPayload({
              ...partialPayloadBase,
              items: partialItems,
            });
          },
        },
      );

      if (items.length === 0 && unmatchedHareruya.length === 0) {
        throw new Error("比較できるカードが見つかりませんでした。名称マッチングを確認してください。");
      }

      const hareruyaSourceUpdatedAt = hareruyaResult.pageUpdatedAt["buying-list"] ?? null;

      const payload: ComparisonPayload = {
        ...partialPayloadBase,
        updatedAt: new Date().toISOString(),
        items,
      };

      saveComparisonPayload(payload);
      saveComparisonSourceWatchState(
        {
          cardRushUpdatedAt: cardrushResult.updatedAt,
          cardRushLastPage: cardrushResult.lastPage,
          hareruyaUpdatedAt: hareruyaSourceUpdatedAt,
        },
        { refreshTriggered: true },
      );

      updateProgress({
        status: "done",
        message: `更新完了（比較 ${items.length.toLocaleString("ja-JP")}件 / 未比較 ${unmatchedHareruya.length.toLocaleString("ja-JP")}件）`,
        finishedAt: new Date().toISOString(),
        cardrushSellStats: null,
      });

      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新に失敗しました";
      updateProgress({
        status: "error",
        message,
        error: message,
        finishedAt: new Date().toISOString(),
      });
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
