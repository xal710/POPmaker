export const MIZUNO_USERNAME = "h.mizuno";

export function isMizunoAccount(username: string | null | undefined): boolean {
  return username === MIZUNO_USERNAME;
}

/** Excelエクスポート（絞り込み・並び替え済みリスト） */
export function canExportComparisonExcel(username: string | null | undefined): boolean {
  return isMizunoAccount(username);
}

/** 晴れる屋2取得順の並び替え */
export function canUseHareruyaSourceOrderSort(username: string | null | undefined): boolean {
  return isMizunoAccount(username);
}

/** ツイート履歴ナビ・画面 */
export function showTweetHistoryFeature(username: string | null | undefined): boolean {
  return !isMizunoAccount(username);
}

/** POP配置ナビ・画面（canUsePopPlacement と併用） */
export function showPopPlacementFeature(
  username: string | null | undefined,
  canUsePopPlacement: boolean,
): boolean {
  if (!canUsePopPlacement) return false;
  return !isMizunoAccount(username);
}
