import type { CardRushRawRow } from "./fetch/cardrush";
import type { RawPriceRow } from "./fetch/hareruya";
import {
  detectMirrorVariantLabel,
  normalizeHareruyaPackCode,
  type MirrorVariantLabel,
} from "../shared/hareruyaPack";

export {
  buildHareruyaVariantPackCode,
  detectMirrorVariantLabel,
  normalizeHareruyaPackCode,
  type MirrorVariantLabel,
} from "../shared/hareruyaPack";

const HARERUYA_SPEC_PATTERN = /\([^)]*\)\{[^}]*\}/g;

const CARD_RUSH_KEPT_PARENTHETICALS = new Set([
  "未開封",
  "R団ミラー",
  "エネルギーミラー",
  "ボールミラー",
  "マスターボールミラー",
  "モンスターボールミラー",
]);

const BALL_MIRROR_PATTERN =
  /マスターボールミラー|モンスターボールミラー|エネルギーミラー|R団ミラー|ボールミラー/;

const HARERUYA_COLON_VARIANTS: Array<{ pattern: RegExp; label: MirrorVariantLabel }> = [
  { pattern: /:エネルギーミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "エネルギーミラー" },
  { pattern: /:モンスターボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "モンスターボールミラー" },
  { pattern: /:マスターボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "マスターボールミラー" },
  { pattern: /:ボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "ボールミラー" },
  { pattern: /:R団ミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "R団ミラー" },
];

export interface CardRushPriceBucket {
  normal: number | null;
  mirror: number | null;
  other: number | null;
}

function shouldKeepCardRushParenthetical(inner: string): boolean {
  if (inner.includes("未開封")) return true;
  return CARD_RUSH_KEPT_PARENTHETICALS.has(inner);
}

function normalizeCardRushMirrorLabel(inner: string): string | null {
  if (inner.includes("エネルギーミラー")) return "エネルギーミラー";
  if (inner.includes("モンスターボールミラー")) return "モンスターボールミラー";
  if (inner.includes("マスターボールミラー")) return "マスターボールミラー";
  if (inner.includes("ボールミラー")) return "ボールミラー";
  if (inner.includes("R団ミラー")) return "R団ミラー";
  return null;
}

/** カードラッシュ: 先頭/末尾の () をマクロ仕様どおりに整形 */
export function simplifyCardRushParenthetical(name: string): string {
  let result = name.trim();

  const leadingSealed = result.match(/^\(([^)]*未開封[^)]*)\)(.+)$/);
  if (leadingSealed) {
    return `${leadingSealed[2].trim()}(未開封)`;
  }

  const match = result.match(/^(.+?)\(([^)]*)\)(.*)$/);
  if (!match) return result;

  const [, base, inner, rest] = match;
  const parts = inner.split("/").map((part) => part.trim());

  if (parts.some((part) => part.includes("未開封"))) {
    return `${base}(未開封)${rest}`;
  }

  const mirrorLabel = normalizeCardRushMirrorLabel(inner);
  if (mirrorLabel) {
    return `${base}(${mirrorLabel})${rest}`;
  }

  const firstPart = parts[0] ?? inner;
  return `${base}(${firstPart})${rest}`;
}

/** カードラッシュ元データのカード名（extra_difference を括弧付きで付与） */
export function buildCardRushSourceName(row: CardRushRawRow): string {
  const extra = row.extraDifference?.trim();
  if (!extra) return row.name.trim();
  return `${row.name.trim()}(${extra})`;
}

export function detectCardRushVariant(row: CardRushRawRow): "mirror" | "normal" | "other" {
  const extra = row.extraDifference?.trim() ?? "";
  const name = row.name.trim();
  const tagged = `${name} ${extra}`;

  if (extra === "ノーマル仕様" || name.includes("(ノーマル仕様)")) {
    return "normal";
  }

  if (BALL_MIRROR_PATTERN.test(tagged)) {
    return "other";
  }

  if (extra === "ミラー" || name.includes("(ミラー)")) {
    return "mirror";
  }

  return "other";
}

/**
 * マクロのカードラッシュ名称処理:
 * - 特定のミラー種別と (未開封) のみ残す
 * - (X)(Y)(R仕様)(ミラー) 等は除去
 */
export function finalizeCardRushCardName(name: string): string {
  let result = name.trim();

  for (;;) {
    const trailing = result.match(/^(.+?)\(([^)]*)\)\s*$/);
    if (!trailing) break;

    const base = trailing[1].trimEnd();
    const inner = trailing[2].trim();

    if (!shouldKeepCardRushParenthetical(inner)) {
      result = base;
      continue;
    }

    if (inner.includes("未開封")) {
      result = `${base} (未開封)`;
    } else {
      result = `${base} (${inner})`;
    }
    break;
  }

  return result.replace(/([^\s])\(/g, "$1 (").replace(/\s+/g, " ").trim();
}

export function normalizeHareruyaName(name: string): string {
  let result = name.trim();

  for (const { pattern, label } of HARERUYA_COLON_VARIANTS) {
    result = result.replace(pattern, ` (${label})`);
  }

  result = result.replace(/:ミラー(?:\([^)]*\))*\{[^}]*\}/g, " (ミラー)");
  result = result.replace(/:([\wぁ-んァ-ヶ一-龠]+仕様)\([^)]*\)\{[^}]*\}/g, ":$1");
  result = result.replace(HARERUYA_SPEC_PATTERN, "");
  result = result.replace(/\[([^\]]+)\]/g, (_match, packCode: string) => {
    return `[${normalizeHareruyaPackCode(packCode)}]`;
  });

  return result.replace(/\s+/g, " ").trim();
}

const IMAGE_LOOKUP_KEPT_PARENTHETICALS = new Set([
  "未開封",
  "R団ミラー",
  "エネルギーミラー",
  "ボールミラー",
  "マスターボールミラー",
  "モンスターボールミラー",
  "ミラー",
]);

function stripRarityParentheticalsBeforeCode(name: string): string {
  return name.replace(/\(([^)]*)\)(?=\s*〈)/g, (match, inner: string) => {
    const trimmed = inner.trim();
    if (IMAGE_LOOKUP_KEPT_PARENTHETICALS.has(trimmed)) return match;
    if (trimmed.includes("ミラー")) return match;
    if (trimmed.includes("未開封")) return match;
    return "";
  });
}

/** 画像照合用キー（晴れる屋表記・比較表表記を同一形式に揃える） */
export function normalizeImageLookupKey(name: string): string {
  const normalized = normalizeHareruyaName(name);
  return stripRarityParentheticalsBeforeCode(normalized).replace(/\s+/g, " ").trim();
}

export function normalizeCardRushName(
  sourceName: string,
  pack: string | null,
  modelNumber: string | null,
): string {
  let cardName = simplifyCardRushParenthetical(sourceName.trim());
  cardName = finalizeCardRushCardName(cardName);

  const model = (modelNumber ?? "").trim();
  const packCode = (pack ?? "").trim();
  const body = `${cardName}〈${model}〉`;

  if (packCode && packCode !== "その他") {
    return `${body}[${packCode}]`;
  }

  return body;
}

export function isHareruyaMirrorKey(key: string): boolean {
  return / \(ミラー\)/.test(key);
}

export function cardrushLookupKey(hareruyaKey: string): string {
  return hareruyaKey.replace(/ \(ミラー\)/, "");
}

export function resolveCardRushPrice(
  hareruyaKey: string,
  bucket: CardRushPriceBucket,
): number | undefined {
  if (isHareruyaMirrorKey(hareruyaKey)) {
    return bucket.mirror ?? undefined;
  }

  if (bucket.normal !== null) {
    return bucket.normal;
  }

  if (bucket.other !== null) {
    return bucket.other;
  }

  return undefined;
}

function createEmptyBucket(): CardRushPriceBucket {
  return { normal: null, mirror: null, other: null };
}

export interface HareruyaPriceEntry {
  price: number;
  series: import("./series").CardSeries | null;
  rawName: string;
}

export function normalizeHareruyaRows(
  rows: RawPriceRow[],
): Map<string, HareruyaPriceEntry> {
  const map = new Map<string, HareruyaPriceEntry>();

  for (const row of rows) {
    const key = normalizeHareruyaName(row.name);
    map.set(key, { price: row.price, series: row.series, rawName: row.name });
  }

  return map;
}

export function normalizeCardRushRows(rows: CardRushRawRow[]): Map<string, CardRushPriceBucket> {
  const map = new Map<string, CardRushPriceBucket>();

  for (const row of rows) {
    const sourceName = buildCardRushSourceName(row);
    const key = normalizeCardRushName(sourceName, row.pack, row.modelNumber);
    const bucket = map.get(key) ?? createEmptyBucket();
    const variant = detectCardRushVariant(row);

    if (variant === "mirror" && bucket.mirror === null) {
      bucket.mirror = row.price;
    } else if (variant === "normal" && bucket.normal === null) {
      bucket.normal = row.price;
    } else if (variant === "other" && bucket.other === null) {
      bucket.other = row.price;
    }

    map.set(key, bucket);
  }

  return map;
}
