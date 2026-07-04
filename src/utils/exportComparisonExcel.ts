import * as XLSX from "xlsx";

import type { ComparisonItem } from "../types";
import { getComparisonListCardName } from "./format";

function buildExportFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `買取価格比較_${year}${month}${day}_${hour}${minute}.xlsx`;
}

export function exportComparisonExcel(items: ComparisonItem[]): string {
  const rows: unknown[][] = [
    ["カード名(晴れる屋2準拠)", "晴れる屋２の価格", "カードラッシュの価格", "差額"],
    ...items.map((item) => [
      getComparisonListCardName(item),
      item.hareruya2,
      item.cardrush ?? "",
      item.cardrush !== null ? item.hareruya2 - item.cardrush : "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "買取価格比較");

  const filename = buildExportFilename();
  XLSX.writeFile(workbook, filename);
  return filename;
}
