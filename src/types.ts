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
  hareruyaSellPrice?: number;
  hareruyaSeriesName?: string;
  officialBuyListVisible?: boolean;
  /** 晴れる屋2 API取得配列での初出順（0始まり） */
  hareruyaSourceOrder?: number;
  cardrushOchaProductId?: number;
  cardrushSellPrice?: number | null;
  hareruyaProductId?: number | null;
}

export interface HareruyaOnlyItem {
  id: number;
  name: string;
  hareruyaTitle?: string;
  rarity?: string;
  hareruya2: number;
  series?: ComparisonItem["series"];
  hareruyaSellPrice?: number;
  hareruyaSeriesName?: string;
  officialBuyListVisible?: boolean;
  /** 晴れる屋2 API取得配列での初出順（0始まり） */
  hareruyaSourceOrder?: number;
  hareruyaProductId?: number | null;
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
