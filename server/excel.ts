import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  COMPARISON_SHEET_NAME,
  getComparisonJsonPath,
  getExcelPath,
} from "./config";
import {
  isExcelFileLockedError,
  readComparisonFromExcelCom,
} from "./excelWindows";

export interface ComparisonItem {
  id: number;
  name: string;
  cardrush: number;
  hareruya2: number;
  diff: number;
  series?: "M" | "SV" | "S" | "SM" | "XY" | "BW";
}

export interface ComparisonPayload {
  updatedAt: string;
  source: "excel" | "json" | "web";
  excelPath: string | null;
  excelModifiedAt: string | null;
  dataDate: string | null;
  hareruyaBuyListUpdatedAt?: Partial<Record<string, string>>;
  items: ComparisonItem[];
  warning?: string;
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

function detectLatestDataDate(workbook: XLSX.WorkBook): string | null {
  const dates = workbook.SheetNames.map((name) => name.match(/^(20\d{6})_/)?.[1])
    .filter((value): value is string => Boolean(value))
    .sort();

  return dates.at(-1) ?? null;
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

function buildPayload(
  excelPath: string,
  items: ComparisonItem[],
  dataDate: string | null,
): ComparisonPayload {
  const fileModifiedAt = statSync(excelPath).mtime.toISOString();

  return {
    updatedAt: fileModifiedAt,
    source: "excel",
    excelPath,
    excelModifiedAt: fileModifiedAt,
    dataDate,
    items,
  };
}

function readComparisonFromExcelFile(excelPath: string): ComparisonPayload {
  const buffer = readFileSync(excelPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames.includes(COMPARISON_SHEET_NAME)) {
    throw new Error(`シート「${COMPARISON_SHEET_NAME}」が見つかりません`);
  }

  const sheet = workbook.Sheets[COMPARISON_SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const items = parseComparisonRows(rows.slice(1));
  if (items.length === 0) {
    throw new Error("比較データが空です。Excelでマクロを実行してください。");
  }

  return buildPayload(excelPath, items, detectLatestDataDate(workbook));
}

export function readComparisonFromExcel(excelPath = getExcelPath()): ComparisonPayload {
  if (!existsSync(excelPath)) {
    throw new Error(`Excelファイルが見つかりません: ${excelPath}`);
  }

  try {
    return readComparisonFromExcelFile(excelPath);
  } catch (error) {
    if (process.platform === "win32" && isExcelFileLockedError(error)) {
      return readComparisonFromExcelCom(excelPath);
    }

    if (process.platform === "win32") {
      try {
        return readComparisonFromExcelCom(excelPath);
      } catch {
        // fall through to original error
      }
    }

    const message = error instanceof Error ? error.message : "不明なエラー";
    throw new Error(`Excelファイルを読み込めませんでした。（${message}）`);
  }
}

export function readComparisonFromJson(): ComparisonPayload {
  const jsonPath = getComparisonJsonPath();
  const raw = JSON.parse(readFileSync(jsonPath, "utf-8")) as ComparisonPayload;
  return {
    ...raw,
    source: "json",
    excelPath: raw.excelPath ?? null,
    excelModifiedAt: raw.excelModifiedAt ?? null,
    dataDate: raw.dataDate ?? null,
    hareruyaBuyListUpdatedAt: raw.hareruyaBuyListUpdatedAt,
  };
}

export function saveComparisonJson(payload: ComparisonPayload): void {
  writeFileSync(getComparisonJsonPath(), JSON.stringify(payload, null, 2), "utf-8");
}

export function loadComparisonData(): ComparisonPayload {
  try {
    const payload = readComparisonFromExcel();
    saveComparisonJson(payload);
    return payload;
  } catch (excelError) {
    try {
      const fallback = readComparisonFromJson();
      const message =
        excelError instanceof Error ? excelError.message : "Excelの読み込みに失敗しました";
      return {
        ...fallback,
        warning: `${message} バックアップJSONを表示しています。`,
      };
    } catch {
      throw excelError;
    }
  }
}
