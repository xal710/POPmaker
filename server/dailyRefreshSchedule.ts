import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDataDir } from "./config";
import { getRefreshProgress, refreshComparisonFromWeb } from "./refreshComparison";

const STATE_FILENAME = "daily_refresh_schedule.json";
const CHECK_INTERVAL_MS = 30_000;

export interface DailyRefreshScheduleState {
  lastTriggeredDate: string | null;
  lastTriggeredAt: string | null;
}

let checkTimer: ReturnType<typeof setInterval> | null = null;
let runningPromise: Promise<void> | null = null;

function getStatePath(): string {
  return resolve(getDataDir(), STATE_FILENAME);
}

export function isDailyRefreshScheduleEnabled(): boolean {
  return process.env.DAILY_REFRESH !== "0";
}

export function getDailyRefreshHourJst(): number {
  const raw = process.env.DAILY_REFRESH_HOUR;
  if (!raw) return 7;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : 7;
}

export function getDailyRefreshMinuteJst(): number {
  const raw = process.env.DAILY_REFRESH_MINUTE;
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 59 ? parsed : 0;
}

/** 7時に起動できなかった場合の追いかけ上限（既定 12:00 JST） */
export function getDailyRefreshCatchupUntilHourJst(): number {
  const raw = process.env.DAILY_REFRESH_CATCHUP_UNTIL_HOUR;
  if (!raw) return 12;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : 12;
}

export function getJstParts(now = new Date()): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function shouldTriggerDailyRefresh(
  state: DailyRefreshScheduleState,
  now = new Date(),
  options?: {
    hour?: number;
    minute?: number;
    catchupUntilHour?: number;
  },
): boolean {
  const hour = options?.hour ?? getDailyRefreshHourJst();
  const minute = options?.minute ?? getDailyRefreshMinuteJst();
  const catchupUntilHour = options?.catchupUntilHour ?? getDailyRefreshCatchupUntilHourJst();
  const { dateKey, hour: nowHour, minute: nowMinute } = getJstParts(now);

  if (state.lastTriggeredDate === dateKey) {
    return false;
  }

  const minutesNow = nowHour * 60 + nowMinute;
  const minutesStart = hour * 60 + minute;
  const minutesCatchupEnd = catchupUntilHour * 60;

  if (minutesNow < minutesStart) {
    return false;
  }

  // 追いかけは正午まで。それ以降の再起動では勝手に全件更新しない
  if (minutesNow > minutesCatchupEnd) {
    return false;
  }

  return true;
}

export function loadDailyRefreshScheduleState(): DailyRefreshScheduleState {
  const path = getStatePath();
  if (!existsSync(path)) {
    return { lastTriggeredDate: null, lastTriggeredAt: null };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as DailyRefreshScheduleState;
    return {
      lastTriggeredDate: parsed.lastTriggeredDate ?? null,
      lastTriggeredAt: parsed.lastTriggeredAt ?? null,
    };
  } catch {
    return { lastTriggeredDate: null, lastTriggeredAt: null };
  }
}

export function saveDailyRefreshScheduleState(state: DailyRefreshScheduleState): void {
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

async function triggerDailyRefresh(dateKey: string): Promise<void> {
  if (runningPromise) {
    return runningPromise;
  }

  if (getRefreshProgress().status === "running") {
    console.log("[daily-refresh] 既存の更新が実行中のためスキップ");
    return;
  }

  runningPromise = (async () => {
    console.log(
      `[daily-refresh] ${dateKey} ${String(getDailyRefreshHourJst()).padStart(2, "0")}:${String(getDailyRefreshMinuteJst()).padStart(2, "0")}枠の定期更新を開始します`,
    );
    saveDailyRefreshScheduleState({
      lastTriggeredDate: dateKey,
      lastTriggeredAt: new Date().toISOString(),
    });

    try {
      await refreshComparisonFromWeb();
      console.log("[daily-refresh] 定期更新が完了しました");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[daily-refresh] 定期更新に失敗:", message);
      // 失敗時は同日の再試行を許す
      const state = loadDailyRefreshScheduleState();
      if (state.lastTriggeredDate === dateKey) {
        saveDailyRefreshScheduleState({
          lastTriggeredDate: null,
          lastTriggeredAt: state.lastTriggeredAt,
        });
      }
    }
  })().finally(() => {
    runningPromise = null;
  });

  return runningPromise;
}

export async function runDailyRefreshScheduleCheck(now = new Date()): Promise<boolean> {
  const state = loadDailyRefreshScheduleState();
  if (!shouldTriggerDailyRefresh(state, now)) {
    return false;
  }

  const { dateKey } = getJstParts(now);
  await triggerDailyRefresh(dateKey);
  return true;
}

export function startDailyRefreshSchedule(): () => void {
  if (!isDailyRefreshScheduleEnabled()) {
    console.log("[daily-refresh] 無効 (DAILY_REFRESH=0)");
    return () => {};
  }

  if (checkTimer) {
    return stopDailyRefreshSchedule;
  }

  const hour = getDailyRefreshHourJst();
  const minute = getDailyRefreshMinuteJst();
  const catchupUntil = getDailyRefreshCatchupUntilHourJst();
  console.log(
    `[daily-refresh] 開始（毎日 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} JST / 追いかけ〜${String(catchupUntil).padStart(2, "0")}:00）`,
  );

  // 起動直後に一度判定（サーバー再起動時の追いかけ）
  void runDailyRefreshScheduleCheck().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[daily-refresh] 起動時チェック失敗:", message);
  });

  checkTimer = setInterval(() => {
    void runDailyRefreshScheduleCheck().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[daily-refresh] スケジュールチェック失敗:", message);
    });
  }, CHECK_INTERVAL_MS);

  return stopDailyRefreshSchedule;
}

export function stopDailyRefreshSchedule(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}
