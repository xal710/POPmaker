import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findLatestComparisonBackup,
  getComparisonBackupPath,
  listComparisonBackupDateKeys,
  persistComparisonPayload,
  restoreComparisonFromBackupIfNewer,
} from "../server/comparisonBackup";
import type { ComparisonPayload } from "../server/excel";

function makePayload(dataDate: string, updatedAt: string): ComparisonPayload {
  return {
    updatedAt,
    source: "web",
    excelPath: null,
    excelModifiedAt: null,
    dataDate,
    items: [
      {
        id: 0,
        name: "テスト〈001/001〉[SV]",
        cardrush: 100,
        hareruya2: 200,
        diff: 100,
      },
    ],
  };
}

const dataDir = mkdtempSync(join(tmpdir(), "pop-backup-test-"));
process.env.DATA_DIR = dataDir;

try {
  persistComparisonPayload(makePayload("20260619", "2026-06-19T10:00:00.000Z"));
  persistComparisonPayload(makePayload("20260620", "2026-06-20T10:00:00.000Z"));
  persistComparisonPayload(makePayload("20260620", "2026-06-20T18:00:00.000Z"));

  const keys = listComparisonBackupDateKeys();
  if (keys.join(",") !== "20260620,20260619") {
    throw new Error(`unexpected backup keys: ${keys.join(",")}`);
  }

  const latest = findLatestComparisonBackup();
  if (latest?.updatedAt !== "2026-06-20T18:00:00.000Z") {
    throw new Error("latest backup mismatch");
  }

  const mainPath = join(dataDir, "comparison.json");
  writeFileSync(mainPath, JSON.stringify(makePayload("20260616", "2026-06-16T10:00:00.000Z"), null, 2));

  if (!restoreComparisonFromBackupIfNewer()) {
    throw new Error("expected restore from backup");
  }

  const restored = JSON.parse(readFileSync(mainPath, "utf-8")) as ComparisonPayload;
  if (restored.updatedAt !== "2026-06-20T18:00:00.000Z") {
    throw new Error("restored main file mismatch");
  }

  if (!existsBackup("20260620")) {
    throw new Error("missing dated backup file");
  }

  console.log("OK comparison backup");
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

function existsBackup(dateKey: string): boolean {
  try {
    readFileSync(getComparisonBackupPath(dateKey), "utf-8");
    return true;
  } catch {
    return false;
  }
}
