import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDataDir } from "./config";
import { readComparisonFromJson } from "./excel";
import { fetchCardRushCatalogMeta } from "./fetch/cardrush";
import { fetchBuyListUpdatedAtFromPage } from "./fetch/hareruyaCatalog";
import {
  getRefreshProgress,
  refreshComparisonFromWeb,
} from "./refreshComparison";

const WATCH_STATE_FILENAME = "comparison_source_watch.json";
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;

export interface ComparisonSourceVersions {
  cardRushUpdatedAt: string | null;
  cardRushLastPage: number | null;
  hareruyaUpdatedAt: string | null;
}

export interface ComparisonSourceWatchState extends ComparisonSourceVersions {
  lastCheckedAt: string;
  lastRefreshTriggeredAt: string | null;
}

let watchTimer: ReturnType<typeof setInterval> | null = null;
let watchCyclePromise: Promise<"refreshed" | "unchanged" | "baseline" | "busy"> | null =
  null;

export function isComparisonSourceWatchEnabled(): boolean {
  return process.env.COMPARISON_WATCH !== "0";
}

export function getComparisonWatchIntervalMs(): number {
  const raw = process.env.COMPARISON_WATCH_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : DEFAULT_INTERVAL_MS;
}

function getWatchStatePath(): string {
  return resolve(getDataDir(), WATCH_STATE_FILENAME);
}

export function hasComparisonSourceChange(
  stored: ComparisonSourceVersions,
  live: ComparisonSourceVersions,
): boolean {
  if (!live.cardRushUpdatedAt) {
    return false;
  }

  if (!stored.cardRushUpdatedAt && !stored.hareruyaUpdatedAt) {
    return false;
  }

  if (stored.cardRushUpdatedAt !== live.cardRushUpdatedAt) {
    return true;
  }

  if (
    stored.cardRushLastPage !== null &&
    live.cardRushLastPage !== null &&
    stored.cardRushLastPage !== live.cardRushLastPage
  ) {
    return true;
  }

  if (live.hareruyaUpdatedAt && stored.hareruyaUpdatedAt !== live.hareruyaUpdatedAt) {
    return true;
  }

  return false;
}

export function needsInitialComparisonRefresh(): boolean {
  try {
    const payload = readComparisonFromJson();
    return !payload.cardRushSourceUpdatedAt;
  } catch {
    return true;
  }
}

export function loadComparisonSourceWatchState(): ComparisonSourceWatchState | null {
  const path = getWatchStatePath();
  if (!existsSync(path)) {
    return readWatchStateFromComparisonPayload();
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as ComparisonSourceWatchState;
    if (typeof parsed.lastCheckedAt !== "string") return readWatchStateFromComparisonPayload();
    return parsed;
  } catch {
    return readWatchStateFromComparisonPayload();
  }
}

function readWatchStateFromComparisonPayload(): ComparisonSourceWatchState | null {
  try {
    const payload = readComparisonFromJson();
    if (!payload.cardRushSourceUpdatedAt && !payload.hareruyaBuyListUpdatedAt?.["buying-list"]) {
      return null;
    }

    return {
      cardRushUpdatedAt: payload.cardRushSourceUpdatedAt ?? null,
      cardRushLastPage: payload.cardRushLastPage ?? null,
      hareruyaUpdatedAt: payload.hareruyaBuyListUpdatedAt?.["buying-list"] ?? null,
      lastCheckedAt: payload.updatedAt,
      lastRefreshTriggeredAt: payload.source === "web" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export function saveComparisonSourceWatchState(
  versions: ComparisonSourceVersions,
  options?: { refreshTriggered?: boolean },
): void {
  const previous = loadComparisonSourceWatchState();
  const next: ComparisonSourceWatchState = {
    ...versions,
    lastCheckedAt: new Date().toISOString(),
    lastRefreshTriggeredAt: options?.refreshTriggered
      ? new Date().toISOString()
      : (previous?.lastRefreshTriggeredAt ?? null),
  };

  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(getWatchStatePath(), JSON.stringify(next, null, 2), "utf-8");
}

export async function probeComparisonSourceVersions(): Promise<ComparisonSourceVersions> {
  const [cardRush, hareruyaUpdatedAt] = await Promise.all([
    fetchCardRushCatalogMeta(),
    fetchBuyListUpdatedAtFromPage(),
  ]);

  return {
    cardRushUpdatedAt: cardRush.updatedAt,
    cardRushLastPage: cardRush.lastPage,
    hareruyaUpdatedAt,
  };
}

export async function runComparisonSourceWatchCycle(options?: {
  forceRefresh?: boolean;
}): Promise<"refreshed" | "unchanged" | "baseline" | "busy"> {
  if (watchCyclePromise) {
    return watchCyclePromise;
  }

  watchCyclePromise = (async () => {
    if (getRefreshProgress().status === "running") {
      return "busy";
    }

    const live = await probeComparisonSourceVersions();
    const stored = loadComparisonSourceWatchState();

    if (!stored) {
      saveComparisonSourceWatchState(live);
      if (options?.forceRefresh || needsInitialComparisonRefresh()) {
        await refreshComparisonFromWeb();
        return "refreshed";
      }
      return "baseline";
    }

    if (!options?.forceRefresh && !hasComparisonSourceChange(stored, live)) {
      saveComparisonSourceWatchState(live);
      return "unchanged";
    }

    await refreshComparisonFromWeb();
    return "refreshed";
  })().finally(() => {
    watchCyclePromise = null;
  });

  return watchCyclePromise;
}

async function runWatchCycleSafe(): Promise<void> {
  try {
    const result = await runComparisonSourceWatchCycle();
    if (result === "refreshed") {
      console.log("[comparison-watch] ソース更新を検知し、比較データを更新しました");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[comparison-watch] 監視サイクルに失敗:", message);
  }
}

export function startComparisonSourceWatch(): () => void {
  if (!isComparisonSourceWatchEnabled()) {
    console.log("[comparison-watch] 無効 (COMPARISON_WATCH=0)");
    return () => {};
  }

  if (watchTimer) {
    return stopComparisonSourceWatch;
  }

  const intervalMs = getComparisonWatchIntervalMs();
  console.log(
    `[comparison-watch] 開始（${Math.round(intervalMs / 60_000)}分ごとに CR / 晴れる屋の更新を確認）`,
  );

  const startupTimer = setTimeout(() => {
    void runWatchCycleSafe();
  }, STARTUP_DELAY_MS);

  watchTimer = setInterval(() => {
    void runWatchCycleSafe();
  }, intervalMs);

  return () => {
    clearTimeout(startupTimer);
    stopComparisonSourceWatch();
  };
}

export function stopComparisonSourceWatch(): void {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
}
