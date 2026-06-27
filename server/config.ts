import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { restoreComparisonFromBackupIfNewer } from "./comparisonBackup";

const DEFAULT_EXCEL_PATH =
  "c:\\Users\\youse\\Downloads\\買取価格比較\\買取価格比較_ver1.2.xlsm";

const COMPARISON_SHEET_NAME = "買取価格比較表";

export function getProjectRoot(): string {
  if (process.env.PROJECT_ROOT) {
    return resolve(process.env.PROJECT_ROOT);
  }
  return resolve(fileURLToPath(new URL("..", import.meta.url)));
}

function getConfigPath(): string {
  return resolve(getProjectRoot(), "excel-config.json");
}

export function getDataDir(): string {
  if (process.env.DATA_DIR) {
    return resolve(process.env.DATA_DIR);
  }
  return resolve(getProjectRoot(), "data");
}

export function getComparisonJsonPath(): string {
  if (process.env.COMPARISON_DATA_PATH) {
    return resolve(process.env.COMPARISON_DATA_PATH);
  }

  const writablePath = resolve(getDataDir(), "comparison.json");
  if (existsSync(writablePath)) {
    return writablePath;
  }

  const root = getProjectRoot();
  const distPath = resolve(root, "dist/data/comparison.json");
  if (existsSync(distPath)) {
    return distPath;
  }

  return resolve(root, "public/data/comparison.json");
}

export function ensureComparisonDataFile(): void {
  const target = process.env.COMPARISON_DATA_PATH
    ? resolve(process.env.COMPARISON_DATA_PATH)
    : resolve(getDataDir(), "comparison.json");

  mkdirSync(dirname(target), { recursive: true });

  if (restoreComparisonFromBackupIfNewer()) {
    return;
  }

  if (existsSync(target)) {
    return;
  }

  const root = getProjectRoot();
  const seeds = [
    resolve(root, "public/data/comparison.json"),
    resolve(root, "dist/data/comparison.json"),
  ];

  for (const seed of seeds) {
    if (existsSync(seed)) {
      copyFileSync(seed, target);
      return;
    }
  }

  throw new Error("comparison.json の初期データが見つかりません");
}

export function getExcelPath(): string {
  if (process.env.POP_EXCEL_PATH) {
    return process.env.POP_EXCEL_PATH;
  }

  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
        excelPath?: string;
      };
      if (config.excelPath) {
        return config.excelPath;
      }
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_EXCEL_PATH;
}

export { COMPARISON_SHEET_NAME };
