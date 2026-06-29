import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import {
  POP_PLACEMENT_LAYOUT_VERSION,
  type PopPlacementAssignmentStore,
  type PopPlacementPayload,
} from "../shared/popPlacement";
import { getDataDir } from "./config";

const BACKUP_DIR_NAME = "pop-placement-backups";
const BACKUP_KEEP_COUNT = 30;
const BACKUP_FILENAME_PATTERN = /^(\d{8}T\d{6}Z)\.json$/;

function emptyPayload(): PopPlacementPayload {
  return {
    layoutVersion: POP_PLACEMENT_LAYOUT_VERSION,
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
    assignments: {},
  };
}

export function getPopPlacementBackupDir(): string {
  return resolve(getDataDir(), BACKUP_DIR_NAME);
}

export function getWritablePopPlacementJsonPath(): string {
  return resolve(getDataDir(), "pop-placement.json");
}

function readPayload(path: string): PopPlacementPayload | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as PopPlacementPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.layoutVersion !== POP_PLACEMENT_LAYOUT_VERSION) return null;
    if (!parsed.assignments || typeof parsed.assignments !== "object") return null;
    if (typeof parsed.updatedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function payloadTimestamp(payload: PopPlacementPayload): number {
  const updatedAt = Date.parse(payload.updatedAt);
  return Number.isNaN(updatedAt) ? 0 : updatedAt;
}

function backupFileName(date = new Date()): string {
  return `${date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}.json`;
}

function getBackupPath(fileName: string): string {
  return resolve(getPopPlacementBackupDir(), fileName);
}

export function listPopPlacementBackupFileNames(): string[] {
  const backupDir = getPopPlacementBackupDir();
  if (!existsSync(backupDir)) return [];

  return readdirSync(backupDir)
    .map((name) => BACKUP_FILENAME_PATTERN.exec(name)?.[1] ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a));
}

export function findLatestPopPlacementBackup(): PopPlacementPayload | null {
  for (const stamp of listPopPlacementBackupFileNames()) {
    const payload = readPayload(getBackupPath(`${stamp}.json`));
    if (payload) return payload;
  }

  return null;
}

function pruneOldBackups(): void {
  const backupDir = getPopPlacementBackupDir();
  if (!existsSync(backupDir)) return;

  const files = listPopPlacementBackupFileNames();
  for (const stamp of files.slice(BACKUP_KEEP_COUNT)) {
    unlinkSync(getBackupPath(`${stamp}.json`));
  }
}

export function readPopPlacementPayload(): PopPlacementPayload {
  const mainPath = getWritablePopPlacementJsonPath();
  const main = existsSync(mainPath) ? readPayload(mainPath) : null;
  if (main) return main;

  const latestBackup = findLatestPopPlacementBackup();
  if (latestBackup) return latestBackup;

  return emptyPayload();
}

/** 本番ファイルとタイムスタンプ付きバックアップへ保存 */
export function persistPopPlacementPayload(payload: PopPlacementPayload): void {
  const mainPath = getWritablePopPlacementJsonPath();
  const backupDir = getPopPlacementBackupDir();
  const json = JSON.stringify(payload, null, 2);

  mkdirSync(getDataDir(), { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(mainPath, json, "utf-8");
  writeFileSync(getBackupPath(backupFileName()), json, "utf-8");
  pruneOldBackups();
}

export function savePopPlacementAssignments(
  assignments: PopPlacementAssignmentStore,
  updatedBy: string,
): PopPlacementPayload {
  const payload: PopPlacementPayload = {
    layoutVersion: POP_PLACEMENT_LAYOUT_VERSION,
    updatedAt: new Date().toISOString(),
    updatedBy,
    assignments,
  };

  persistPopPlacementPayload(payload);
  return payload;
}

/** 起動時: バックアップの方が新しければ本番ファイルへ復元 */
export function restorePopPlacementFromBackupIfNewer(): boolean {
  const mainPath = getWritablePopPlacementJsonPath();
  const latestBackup = findLatestPopPlacementBackup();
  if (!latestBackup) return false;

  if (!existsSync(mainPath)) {
    persistPopPlacementPayload(latestBackup);
    return true;
  }

  const current = readPayload(mainPath);
  if (!current) {
    persistPopPlacementPayload(latestBackup);
    return true;
  }

  if (payloadTimestamp(latestBackup) <= payloadTimestamp(current)) {
    return false;
  }

  persistPopPlacementPayload(latestBackup);
  return true;
}

export function ensurePopPlacementDataFile(): void {
  restorePopPlacementFromBackupIfNewer();

  const mainPath = getWritablePopPlacementJsonPath();
  if (existsSync(mainPath)) return;

  persistPopPlacementPayload(emptyPayload());
}
