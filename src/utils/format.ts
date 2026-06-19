export function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDiff(diff: number): string {
  const sign = diff > 0 ? "+" : "";
  return `${sign}${formatYen(diff)}`;
}

function packLabelFromCode(pack: string): string {
  const alphaPrefix = pack.match(/^[A-Za-z]+/)?.[0];
  if (alphaPrefix) return alphaPrefix;
  return pack;
}

/** POP表示用: 括弧類を半角に統一 */
export function normalizeHalfWidthBrackets(text: string): string {
  return text
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/｛/g, "{")
    .replace(/｝/g, "}");
}

/**
 * 晴れる屋2表記を整形する。
 * 例: ゼルネアスEX(CP){フェアリー}〈038/036〉[CP5] → ゼルネアスEX(CP)[CP5]
 * 書式: カード名(レアリティor技名)[エキスパンション]（括弧は半角）
 */
export function formatHareruyaCardName(name: string): string {
  const normalized = normalizeHalfWidthBrackets(name);

  const stripped = normalized
    .replace(/\{[^}]*\}/g, "")
    .replace(/〈[^〉]*〉/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const packMatch = stripped.match(/\[([^\]]+)\]/);
  const pack = packMatch?.[1]?.trim() ?? "";
  if (!pack) return stripped;

  const packSuffix = `[${pack}]`;
  const packIndex = stripped.lastIndexOf(packSuffix);
  const beforePack = stripped.slice(0, packIndex).trim();

  if (/\([^)]+\)\s*$/.test(beforePack)) {
    return `${beforePack.replace(/\s+\(/g, "(")}${packSuffix}`;
  }

  const base = beforePack.trim();
  return `${base}(${packLabelFromCode(pack)})${packSuffix}`;
}

/** POP用・ツイート用のカード名（晴れる屋2表記ベース） */
export function formatPopCopyName(name: string): string {
  return formatHareruyaCardName(name);
}

/** ツイート用カード名（POP用と同じ整形） */
export function formatTweetCardName(name: string): string {
  return formatHareruyaCardName(name);
}

export function buildPopText(name: string, hareruya2: number): string {
  return [formatPopCopyName(name), formatYen(hareruya2)].join("\n");
}

/** POP画像の保存ファイル名（例: ゼルネアスEX(CP)[CP5].png） */
export function formatPopImageFilename(sourceName: string): string {
  const base = formatPopCopyName(sourceName).replace(/[\\/:*?"<>|]/g, "");
  return `${base}.png`;
}

const TWEET_FOOTER = `アネックス店、地下買取フロアでは複数のスタッフにて査定を実施しております👍

#ハレツー #ポケカ
▼その他の買取情報はこちら▼
hareruya2.com/pages/buying`;

export function buildTweetText(name: string, hareruya2: number): string {
  const cardName = formatTweetCardName(name);
  const price = formatYen(hareruya2);

  return `【買取情報】

「一言コメント！」

${cardName}
${price}

${TWEET_FOOTER}`;
}
