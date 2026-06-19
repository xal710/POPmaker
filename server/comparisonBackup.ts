import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { getDataDir } from "./config";
import type { ComparisonPayload } from "./excel";

const BACKUP_DIR_NAME = "backups";
const BACKUP_KEEP_DAYS = 30;
const BACKUP_FILENAME_PATTERN = /^(\d{8})\.json$/;

export function getComparisonBackupDir(): string {
  return resolve(getDataDir(), BACKUP_DIR_NAME);
}

export function getWritableComparisonJsonPath(): string {
  return resolve(getDataDir(), "comparison.json");
}

function resolveBackupDateKey(payload: ComparisonPayload): string {
  if (payload.dataDate && /^\d{8}$/.test(payload.dataDate)) {
    return payload.dataDate;
  }

  const fromUpdatedAt = payload.updatedAt.slice(0, 10).replace(/-/g, "");
  return fromUpdatedAt || new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

export function getComparisonBackupPath(dateKey: string): string {
  return resolve(getComparisonBackupDir(), `${dateKey}.json`);
}

function readPayload(path: string): ComparisonPayload | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ComparisonPayload;
  } catch {
    return null;
  }
}

function payloadTimestamp(payload: ComparisonPayload): number {
  const updatedAt = Date.parse(payload.updatedAt);
  if (!Number.isNaN(updatedAt)) return updatedAt;

  const dataDate = payload.dataDate;
  if (dataDate && /^\d{8}$/.test(dataDate)) {
    const y = Number(dataDate.slice(0, 4));
    const m = Number(dataDate.slice(4, 6));
    const d = Number(dataDate.slice(6, 8));
    return Date.UTC(y, m - 1, d);
  }

  return 0;
}

export function listComparisonBackupDateKeys(): string[] {
  const backupDir = getComparisonBackupDir();
  if (!existsSync(backupDir)) return [];

  return readdirSync(backupDir)
    .map((name) => BACKUP_FILENAME_PATTERN.exec(name)?.[1] ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a));
}

export function findLatestComparisonBackup(): ComparisonPayload | null {
  for (const dateKey of listComparisonBackupDateKeys()) {
    const payload = readPayload(getComparisonBackupPath(dateKey));
    if (payload?.items?.length) {
      return payload;
    }
  }

  return null;
}

function pruneOldBackups(todayKey: string): void {
  const backupDir = getComparisonBackupDir();
  if (!existsSync(backupDir)) return;

  const today = parseDateKey(todayKey);
  if (!today) return;

  for (const dateKey of listComparisonBackupDateKeys()) {
    const date = parseDateKey(dateKey);
    if (!date) continue;

    const ageDays = Math.floor((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays > BACKUP_KEEP_DAYS) {
      unlinkSync(getComparisonBackupPath(dateKey));
    }
  }
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{8}$/.test(dateKey)) return null;
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(4, 6));
  const d = Number(dateKey.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}

/** 本番ファイルと日付キー付きバックアップへ保存（同一日は上書き） */
export function persistComparisonPayload(payload: ComparisonPayload): void {
  const mainPath = getWritableComparisonJsonPath();
  const backupDir = getComparisonBackupDir();
  const dateKey = resolveBackupDateKey(payload);
  const backupPath = getComparisonBackupPath(dateKey);
  const json = JSON.stringify(payload, null, 2);

  mkdirSync(getDataDir(), { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(mainPath, json, "utf-8");
  writeFileSync(backupPath, json, "utf-8");
  pruneOldBackups(dateKey);
}

/** 起動時: バックアップの方が新しければ本番ファイルへ復元 */
export function restoreComparisonFromBackupIfNewer(): boolean {
  const mainPath = getWritableComparisonJsonPath();
  const latestBackup = findLatestComparisonBackup();
  if (!latestBackup) return false;

  if (!existsSync(mainPath)) {
    persistComparisonPayload(latestBackup);
    return true;
  }

  const current = readPayload(mainPath);
  if (!current?.items?.length) {
    persistComparisonPayload(latestBackup);
    return true;
  }

  if (payloadTimestamp(latestBackup) <= payloadTimestamp(current)) {
    return false;
  }

  persistComparisonPayload(latestBackup);
  return true;
}

export function getComparisonBackupStatus(): {
  backupDir: string;
  dates: string[];
  latestDate: string | null;
} {
  const dates = listComparisonBackupDateKeys();
  return {
    backupDir: getComparisonBackupDir(),
    dates,
    latestDate: dates[0] ?? null,
  };
}
