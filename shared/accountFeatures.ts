/** トレード機能: Excelエクスポート・晴れる屋2取得順・専用テンプレート等 */

export function canUseTradeFeatures(enabled: boolean): boolean {
  return enabled;
}

export function canExportComparisonExcel(canUseTradeFeatures: boolean): boolean {
  return canUseTradeFeatures;
}

export function canUseHareruyaSourceOrderSort(canUseTradeFeatures: boolean): boolean {
  return canUseTradeFeatures;
}

/** トレード機能利用時はツイート履歴を非表示 */
export function showTweetHistoryFeature(canUseTradeFeatures: boolean): boolean {
  return !canUseTradeFeatures;
}

/** POP配置はトレード機能と併用しない */
export function showPopPlacementFeature(
  canUseTradeFeatures: boolean,
  canUsePopPlacement: boolean,
): boolean {
  if (!canUsePopPlacement) return false;
  return !canUseTradeFeatures;
}

export function usesTradeDefaultSort(canUseTradeFeatures: boolean): boolean {
  return canUseTradeFeatures;
}

/** トレード機能: 買取・販売価格比較の拡張表示 */
export function showSellPriceComparison(canUseTradeFeatures: boolean): boolean {
  return canUseTradeFeatures;
}
