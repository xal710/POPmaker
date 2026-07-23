import * as XLSX from "xlsx";

import type { ComparisonItem } from "../types";
import {
  computeHareruyaSellMinusCardrushBuy,
  computeHareruyaSellMinusCardrushSell,
  getComparisonListCardName,
} from "./format";

function buildExportFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `買取価格比較_${year}${month}${day}_${hour}${minute}.xlsx`;
}

function emptyIfNull(value: number | null | undefined): number | "" {
  return value == null ? "" : value;
}

export function exportComparisonExcel(items: ComparisonItem[]): string {
  const rows: unknown[][] = [
    [
      "カード名(晴れる屋2準拠)",
      "カードラッシュ買取",
      "晴れる屋2買取",
      "買取差額",
      "カードラッシュ販売",
      "晴れる屋2販売",
      "販売差",
      "仕入差",
    ],
    ...items.map((item) => {
      const buyDiff = item.cardrush != null ? item.hareruya2 - item.cardrush : null;
      const sellDiff = computeHareruyaSellMinusCardrushSell(item);
      const stockDiff = computeHareruyaSellMinusCardrushBuy(item);

      return [
        getComparisonListCardName(item),
        emptyIfNull(item.cardrush),
        item.hareruya2,
        emptyIfNull(buyDiff),
        emptyIfNull(item.cardrushSellPrice),
        emptyIfNull(item.hareruyaSellPrice),
        emptyIfNull(sellDiff),
        emptyIfNull(stockDiff),
      ];
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "買取価格比較");

  const filename = buildExportFilename();
  XLSX.writeFile(workbook, filename);
  return filename;
}
