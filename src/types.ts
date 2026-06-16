export interface ComparisonItem {
  id: number;
  name: string;
  cardrush: number;
  hareruya2: number;
  diff: number;
  series?: "M" | "SV" | "S" | "SM" | "XY" | "BW";
}

export interface ComparisonData {
  updatedAt: string;
  source?: "excel" | "json" | "web";
  excelPath?: string | null;
  excelModifiedAt?: string | null;
  dataDate?: string | null;
  warning?: string;
  items: ComparisonItem[];
}
