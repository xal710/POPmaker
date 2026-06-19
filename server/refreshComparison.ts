import { buildComparisonItems } from "./compare";
import { persistComparisonPayload } from "./comparisonBackup";
import type { ComparisonPayload } from "./excel";
import { fetchCardRushBuyPrices } from "./fetch/cardrush";
import { fetchHareruyaBuyPrices } from "./fetch/hareruya";
import { normalizeCardRushRows, normalizeHareruyaRows } from "./normalize";

export interface RefreshProgress {
  status: "idle" | "running" | "done" | "error";
  message: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

let progress: RefreshProgress = {
  status: "idle",
  message: "待機中",
  startedAt: null,
  finishedAt: null,
  error: null,
};

let refreshPromise: Promise<ComparisonPayload> | null = null;

function updateProgress(patch: Partial<RefreshProgress>): void {
  progress = { ...progress, ...patch };
}

export function getRefreshProgress(): RefreshProgress {
  return progress;
}

export function saveComparisonPayload(payload: ComparisonPayload): void {
  persistComparisonPayload(payload);
}

export async function refreshComparisonFromWeb(): Promise<ComparisonPayload> {
  if (refreshPromise) {
    return refreshPromise;
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
      const cardrushMap = normalizeCardRushRows(cardrushResult.rows);
      const items = buildComparisonItems(hareruyaMap, cardrushMap);

      if (items.length === 0) {
        throw new Error("比較できるカードが見つかりませんでした。名称マッチングを確認してください。");
      }

      const payload: ComparisonPayload = {
        updatedAt: new Date().toISOString(),
        source: "web",
        excelPath: null,
        excelModifiedAt: null,
        dataDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        hareruyaBuyListUpdatedAt: hareruyaResult.pageUpdatedAt,
        items,
        warning: undefined,
      };

      saveComparisonPayload(payload);

      updateProgress({
        status: "done",
        message: `更新完了（${items.length.toLocaleString("ja-JP")}件）`,
        finishedAt: new Date().toISOString(),
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
