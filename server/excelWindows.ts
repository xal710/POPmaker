import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { COMPARISON_SHEET_NAME, getExcelPath, getProjectRoot } from "./config";
import type { ComparisonItem, ComparisonPayload } from "./excel";

function getPsScriptPath(): string {
  return resolve(getProjectRoot(), "tools/read-excel-sheet.ps1");
}

interface ComReadResult {
  rows: unknown[][];
  sheetNames: string[];
}

function detectLatestDataDate(sheetNames: string[]): string | null {
  const dates = sheetNames
    .map((name) => name.match(/^(20\d{6})_/)?.[1])
    .filter((value): value is string => Boolean(value))
    .sort();

  return dates.at(-1) ?? null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseComparisonRows(rows: unknown[][]): ComparisonItem[] {
  const items: ComparisonItem[] = [];

  for (const row of rows) {
    if (!row || !row[0]) continue;

    const name = String(row[0]).trim();
    const cardrush = toNumber(row[1]);
    const hareruya2 = toNumber(row[2]);
    const diff = toNumber(row[3]);

    if (cardrush === null || hareruya2 === null || diff === null) {
      continue;
    }

    items.push({
      id: items.length,
      name,
      cardrush,
      hareruya2,
      diff,
    });
  }

  return items;
}

function readSheetViaExcelCom(excelPath: string): ComReadResult {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", getPsScriptPath()],
    {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        POP_EXCEL_PATH: excelPath,
        POP_SHEET_NAME: COMPARISON_SHEET_NAME,
      },
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || "Excel COM read failed";
    throw new Error(message);
  }

  const stdout = result.stdout?.replace(/^\uFEFF/, "").trim();
  if (!stdout) {
    throw new Error("Excel COM read returned empty data");
  }

  return JSON.parse(stdout) as ComReadResult;
}

export function readComparisonFromExcelCom(
  excelPath = getExcelPath(),
): ComparisonPayload {
  if (!existsSync(excelPath)) {
    throw new Error(`Excelファイルが見つかりません: ${excelPath}`);
  }

  const comData = readSheetViaExcelCom(excelPath);
  const items = parseComparisonRows(comData.rows);

  if (items.length === 0) {
    throw new Error("比較データが空です。Excelでマクロを実行してください。");
  }

  const fileModifiedAt = statSync(excelPath).mtime.toISOString();

  return {
    updatedAt: fileModifiedAt,
    source: "excel",
    excelPath,
    excelModifiedAt: fileModifiedAt,
    dataDate: detectLatestDataDate(comData.sheetNames),
    items,
  };
}

export function isExcelFileLockedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as NodeJS.ErrnoException;
  if (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES") {
    return true;
  }

  const message = err.message?.toLowerCase() ?? "";
  return (
    message.includes("ebusy") ||
    message.includes("locked") ||
    message.includes("being used") ||
    message.includes("使用中")
  );
}
