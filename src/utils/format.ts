import {
  normalizeHareruyaPackCode,
  resolveHareruyaDisplayPackCode,
} from "../../shared/hareruyaPack";
import type { ComparisonItem } from "../types";

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

export type DiffTone = "positive" | "negative" | "zero";

export function getDiffTone(diff: number | null): DiffTone {
  if (diff === null) return "zero";
  if (diff > 0) return "positive";
  if (diff < 0) return "negative";
  return "zero";
}

export function formatDiff(diff: number | null): string {
  if (diff === null) return "—";
  if (diff === 0) return "±0";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${formatYen(diff)}`;
}

export function formatOptionalYen(value: number | null): string {
  if (value === null) return "—";
  return formatYen(value);
}

/** 金額入力欄の文字列を円単位の数値に変換 */
export function parsePriceInput(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return parsed;
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

/** 晴れる屋2買取表準拠の名称（型番・レアリティ等を含むフル表記） */
export function formatHareruyaBuyListName(name: string): string {
  const normalized = normalizeHalfWidthBrackets(name).replace(/\s+/g, " ").trim();
  return normalized.replace(/\[([^\]]+)\]/g, (_match, packCode: string) => {
    return `[${resolveHareruyaDisplayPackCode(normalized, packCode)}]`;
  });
}

/** 比較リストのカード名表示（晴れる屋2買取表準拠） */
export function getComparisonListCardName(
  item: Pick<ComparisonItem, "name" | "hareruyaTitle">,
): string {
  return formatHareruyaBuyListName(item.hareruyaTitle ?? item.name);
}

/**
 * 晴れる屋2サイト表記を整形する。
 * 例: ラプラス (マスターボールミラー)〈131/165〉[SV2a] → ラプラス(マスターボールミラー)[SV2a-Ma]
 * 例: ゼルネアスEX(CP){フェアリー}〈038/036〉[CP5] → ゼルネアスEX(CP)[CP5]
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

  const displayPack = resolveHareruyaDisplayPackCode(normalized, pack);
  const packSuffix = `[${displayPack}]`;
  const packIndex = stripped.lastIndexOf(`[${pack}]`);
  const beforePack = stripped.slice(0, packIndex).trim();

  if (/\([^)]+\)\s*$/.test(beforePack)) {
    return `${beforePack.replace(/\s+\(/g, "(")}${packSuffix}`;
  }

  const base = beforePack.trim();
  return `${base}(${packLabelFromCode(normalizeHareruyaPackCode(pack))})${packSuffix}`;
}

/** POP用・ツイート用のカード名（晴れる屋2表記ベース） */
export function formatPopCopyName(name: string): string {
  return formatHareruyaCardName(name);
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

const TWEET_FOOTER_TAKADANOBABA = `ハレツー高田馬場店では、旧裏やサプライ品、鑑定品まで
なんでも買取致します👌
ポケカの買取はハレツー高田馬場店へ🐴

▼その他の買取情報はこちら▼
http://hareruya2.com/pages/buying`;

const TWEET_FOOTER_KORIYAMA = `是非、#ハレツー郡山店
までお持ちこみ下さい🐲🐲

#ハレツー #ポケカ
▼その他の買取情報はこちら▼
hareruya2.com/pages/buying`;

export type TweetTemplateId = "default" | "takadanobaba" | "koriyama";

export function getTweetTemplateId(username: string | null | undefined): TweetTemplateId {
  if (username === "k.ishigaki") return "takadanobaba";
  if (username === "20260605") return "koriyama";
  return "default";
}

export function buildTweetText(
  name: string,
  hareruya2: number,
  templateId: TweetTemplateId = "default",
): string {
  const cardName = formatHareruyaCardName(name);
  const price = formatYen(hareruya2);

  if (templateId === "takadanobaba") {
    return `【買取情報】

${cardName}
${price}✨

${TWEET_FOOTER_TAKADANOBABA}`;
  }

  if (templateId === "koriyama") {
    return `【買取情報】

「一言コメント！」

${cardName}
${price}

${TWEET_FOOTER_KORIYAMA}`;
  }

  return `【買取情報】

「一言コメント！」

${cardName}
${price}

${TWEET_FOOTER}`;
}
