export interface ComparisonItem {
  id: number;
  name: string;
  hareruyaTitle?: string;
  rarity?: string;
  hareruya2: number;
  cardrush: number | null;
  diff: number | null;
  series?: "M" | "SV" | "S" | "SM" | "XY" | "BW";
  matched: boolean;
}

export interface HareruyaOnlyItem {
  id: number;
  name: string;
  hareruyaTitle?: string;
  rarity?: string;
  hareruya2: number;
  series?: ComparisonItem["series"];
}

export interface ComparisonData {
  updatedAt: string;
  source?: "excel" | "json" | "web";
  excelPath?: string | null;
  excelModifiedAt?: string | null;
  dataDate?: string | null;
  hareruyaBuyListUpdatedAt?: Partial<Record<string, string>>;
  warning?: string;
  items: Array<
    Omit<ComparisonItem, "matched" | "cardrush" | "diff"> & {
      cardrush: number;
      diff: number;
      matched?: boolean;
      hareruyaTitle?: string;
      rarity?: string;
    }
  >;
  unmatchedHareruya?: HareruyaOnlyItem[];
}
