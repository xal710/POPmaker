import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDataDir } from "../config";
import type { CardRushRawRow } from "./cardrushTypes";

export interface CardRushSnapshotMeta {
  updatedAt: string;
  lastPage: number;
  rowCount: number;
  fetchedAt: string;
}

export interface CardRushSnapshot extends CardRushSnapshotMeta {
  rows: CardRushRawRow[];
}

interface BuyingPriceItem {
  name: string;
  pack_code: string | null;
  rarity: string | null;
  model_number: string | null;
  amount: number;
  extra_difference: string | null;
}

const SNAPSHOT_FILENAME = "cardrush_snapshot.json";

let memorySnapshot: CardRushSnapshot | null = null;

export function getCardRushSnapshotPath(): string {
  return resolve(getDataDir(), SNAPSHOT_FILENAME);
}

/** カードラッシュが全ページ共通で返す一覧の更新時刻。2ページ目以降の変更検知はこれに依存する。 */
export function isCardRushSnapshotCacheEnabled(): boolean {
  return process.env.CARD_RUSH_SNAPSHOT === "1";
}

export function buildPageSignature(items: BuyingPriceItem[]): string {
  return items
    .map(
      (item) =>
        [
          item.model_number ?? "",
          item.name,
          item.amount,
          item.pack_code ?? "",
          item.extra_difference ?? "",
        ].join("\t"),
    )
    .join("\n");
}

/** @deprecated buildPageSignature を使用 */
export const buildPage1Signature = buildPageSignature;

/**
 * キャッシュ再利用の判定。
 * updatedAt は全ページで同一の「一覧全体の版」なので、CR が価格改定のたびに進めていれば取りこぼしは起きない。
 * 2ページ目以降だけ変わって updatedAt が据え置き、という CR 側の不具合は検知できない（全ページ取得以外では不可能）。
 */
export function canReuseSnapshot(
  live: {
    updatedAt: string | null;
    lastPage: number;
  },
  cached: CardRushSnapshotMeta,
): boolean {
  if (!isCardRushSnapshotCacheEnabled()) return false;
  if (!live.updatedAt) return false;
  if (live.updatedAt !== cached.updatedAt) return false;
  if (live.lastPage !== cached.lastPage) return false;
  if (cached.rowCount <= 0) return false;
  return true;
}

function readSnapshotFromDisk(): CardRushSnapshot | null {
  const path = getCardRushSnapshotPath();
  if (!existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as CardRushSnapshot;
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;
    if (!parsed.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadCardRushSnapshot(): CardRushSnapshot | null {
  if (memorySnapshot) return memorySnapshot;
  const disk = readSnapshotFromDisk();
  if (disk) memorySnapshot = disk;
  return disk;
}

export function saveCardRushSnapshot(snapshot: CardRushSnapshot): void {
  memorySnapshot = snapshot;
  const path = getCardRushSnapshotPath();
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2), "utf-8");
}

export function clearCardRushSnapshotCache(): void {
  memorySnapshot = null;
}
