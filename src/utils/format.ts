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

export function formatPopCopyName(name: string): string {
  return name.replace(/\{[^}]*\}/g, "").replace(/〈[^〉]*〉/g, "");
}

function packLabelFromCode(pack: string): string {
  const alphaPrefix = pack.match(/^[A-Za-z]+/)?.[0];
  if (alphaPrefix) return alphaPrefix;
  return pack;
}

const TWEET_PAREN_LABELS = [
  "未開封",
  "R団ミラー",
  "エネルギーミラー",
  "ボールミラー",
  "マスターボールミラー",
  "モンスターボールミラー",
  "ミラー",
] as const;

function extractTweetParentheticalLabel(name: string): string | null {
  const match = name.match(/\(([^)]*)\)/);
  if (!match) return null;

  const inner = match[1].trim();
  if (!inner) return null;

  for (const label of TWEET_PAREN_LABELS) {
    if (inner === label || inner.includes(label)) {
      return label;
    }
  }

  return null;
}

/** ツイート用: ゼルネアスEX(CP)[CP5] / ロケット団のフリーザー(R団ミラー)[M2a] 形式 */
export function formatTweetCardName(name: string): string {
  const packMatch = name.match(/\[([^\]]+)\]/);
  const pack = packMatch?.[1]?.trim() ?? "";
  const parenLabel = extractTweetParentheticalLabel(name);

  const base = name
    .replace(/\{[^}]*\}/g, "")
    .replace(/〈[^〉]*〉/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!pack) return base;

  const label = parenLabel ?? packLabelFromCode(pack);
  return `${base}(${label})[${pack}]`;
}

export function buildPopText(name: string, hareruya2: number): string {
  return [formatPopCopyName(name), formatYen(hareruya2)].join("\n");
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
