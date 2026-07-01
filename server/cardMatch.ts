import type { CardRushRawRow } from "./fetch/cardrush";
import {
  detectMirrorVariantLabel,
  normalizeHareruyaPackCode,
  type MirrorVariantLabel,
} from "../shared/hareruyaPack";
import { detectCardRushVariant } from "./normalize";

const TITLE_PATTERN = /^(.+?)〈([^〉]+)〉(?:\[([^\]]+)\])?$/;

const HARERUYA_COLON_VARIANTS: Array<{ pattern: RegExp; label: MirrorVariantLabel }> = [
  { pattern: /:エネルギーミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "エネルギーミラー" },
  { pattern: /:モンスターボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "モンスターボールミラー" },
  { pattern: /:マスターボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "マスターボールミラー" },
  { pattern: /:ボールミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "ボールミラー" },
  { pattern: /:R団ミラー(?:\([^)]*\))*\{[^}]*\}/g, label: "R団ミラー" },
];

const MIRROR_LABELS = new Set<MirrorVariantLabel>([
  "マスターボールミラー",
  "モンスターボールミラー",
  "エネルギーミラー",
  "R団ミラー",
  "ボールミラー",
  "ミラー",
]);

const KEPT_NAME_PARENTHETICALS = new Set(["未開封", ...MIRROR_LABELS]);

export type CardVariant = MirrorVariantLabel | "normal" | "sealed";

export interface CardIdentity {
  baseName: string;
  modelNumber: string;
  packCode: string | null;
  variant: CardVariant;
  rarity: string | null;
}

export interface CardRushMatchEntry {
  identity: CardIdentity;
  price: number;
  priceSlot: "normal" | "mirror" | "other";
}

function isRarityToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (KEPT_NAME_PARENTHETICALS.has(trimmed as MirrorVariantLabel | "未開封")) return false;
  if (trimmed.includes("ミラー")) return false;
  if (trimmed.includes("未開封")) return false;
  if (trimmed.includes("仕様")) return false;
  return true;
}

function normalizeRarity(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/＿/g, "_");
}

export function normalizePackForMatch(packCode: string | null | undefined): string | null {
  if (!packCode) return null;
  const trimmed = packCode.trim();
  if (!trimmed || trimmed === "その他") return null;

  let normalized = normalizeHareruyaPackCode(trimmed);
  const slashIndex = normalized.indexOf("/");
  if (slashIndex > 0) {
    normalized = normalized.slice(0, slashIndex);
  }

  return normalized;
}

function preprocessHareruyaTitle(title: string): string {
  let result = title.trim();

  for (const { pattern, label } of HARERUYA_COLON_VARIANTS) {
    result = result.replace(pattern, ` (${label})`);
  }

  result = result.replace(/:ミラー(?:\([^)]*\))*\{[^}]*\}/g, " (ミラー)");
  return result.replace(/\s+/g, " ").trim();
}

function stripMirrorMarkers(prefix: string): string {
  let result = prefix;

  for (const label of MIRROR_LABELS) {
    result = result.replace(new RegExp(`\\s*\\(${label}\\)\\s*`, "g"), " ");
  }

  return result.replace(/\s+/g, " ").trim();
}

function extractHareruyaRarity(prefix: string): { rarity: string | null; rest: string } {
  let rarity: string | null = null;
  let rest = prefix;

  rest = rest.replace(/\(([^)]*)\)\{[^}]*\}/g, (match, inner: string) => {
    const token = inner.trim();
    if (isRarityToken(token)) {
      rarity = rarity ?? token;
      return "";
    }
    return match;
  });

  const trailing = rest.match(/^(.+?)\(([^)]+)\)\s*$/);
  if (trailing) {
    const [, base, inner] = trailing;
    const token = inner.trim();
    if (!KEPT_NAME_PARENTHETICALS.has(token as MirrorVariantLabel | "未開封") && isRarityToken(token)) {
      rarity = rarity ?? token;
      rest = base.trim();
    }
  }

  return { rarity: normalizeRarity(rarity), rest };
}

function resolveHareruyaVariant(title: string, prefix: string): CardVariant {
  if (prefix.includes("未開封") || title.includes("未開封")) return "sealed";
  return detectMirrorVariantLabel(title) ?? "normal";
}

export function parseHareruyaIdentity(title: string): CardIdentity | null {
  const prepared = preprocessHareruyaTitle(title);
  const match = TITLE_PATTERN.exec(prepared);
  if (!match) return null;

  const [, rawPrefix, modelNumber, packBracket] = match;
  const variant = resolveHareruyaVariant(prepared, rawPrefix);
  const { rarity, rest } = extractHareruyaRarity(rawPrefix);
  const baseName = stripMirrorMarkers(rest);

  if (!baseName) return null;

  return {
    baseName,
    modelNumber: modelNumber.trim(),
    packCode: packBracket?.trim() ?? null,
    variant,
    rarity,
  };
}

function resolveCardRushVariantLabel(row: CardRushRawRow): CardVariant {
  const extra = row.extraDifference?.trim() ?? "";
  const name = row.name.trim();

  if (extra.includes("未開封") || name.includes("未開封")) return "sealed";
  if (extra.includes("マスターボールミラー")) return "マスターボールミラー";
  if (extra.includes("モンスターボールミラー")) return "モンスターボールミラー";
  if (extra.includes("エネルギーミラー")) return "エネルギーミラー";
  if (extra.includes("R団ミラー")) return "R団ミラー";
  if (extra.includes("ボールミラー")) return "ボールミラー";
  if (extra === "ミラー" || name.includes("(ミラー)")) return "ミラー";
  return "normal";
}

export function parseCardRushIdentity(row: CardRushRawRow): CardIdentity | null {
  const modelNumber = (row.modelNumber ?? "").trim();
  if (!modelNumber) return null;

  const baseName = row.name.trim();
  if (!baseName) return null;

  const pack = row.pack?.trim() ?? null;

  return {
    baseName,
    modelNumber,
    packCode: pack && pack !== "その他" ? pack : null,
    variant: resolveCardRushVariantLabel(row),
    rarity: normalizeRarity(row.rarity),
  };
}

function variantsEqual(left: CardVariant, right: CardVariant): boolean {
  return left === right;
}

function identityCoreMatch(
  left: CardIdentity,
  right: CardIdentity,
  options: { requireRarity: boolean },
): boolean {
  if (left.baseName !== right.baseName) return false;
  if (left.modelNumber !== right.modelNumber) return false;
  if (!variantsEqual(left.variant, right.variant)) return false;

  if (options.requireRarity) {
    const leftRarity = normalizeRarity(left.rarity);
    const rightRarity = normalizeRarity(right.rarity);
    if (leftRarity && rightRarity && leftRarity !== rightRarity) {
      return false;
    }
  }

  return true;
}

function entryScore(
  hareruya: CardIdentity,
  entry: CardRushMatchEntry,
  options: { requireRarity: boolean },
): number {
  if (!identityCoreMatch(hareruya, entry.identity, options)) return -1;

  let score = 0;
  const hareruyaPack = normalizePackForMatch(hareruya.packCode);
  const cardrushPack = normalizePackForMatch(entry.identity.packCode);

  if (hareruyaPack && cardrushPack) {
    if (hareruyaPack === cardrushPack) score += 100;
    else return -1;
  } else if (hareruyaPack && !cardrushPack) {
    score += 40;
  } else if (!hareruyaPack && cardrushPack) {
    score += 10;
  } else {
    score += 20;
  }

  if (
    options.requireRarity &&
    hareruya.rarity &&
    entry.identity.rarity &&
    hareruya.rarity === entry.identity.rarity
  ) {
    score += 5;
  }

  return score;
}

function variantToPriceSlot(variant: CardVariant): "normal" | "mirror" | "other" {
  if (variant === "ミラー") return "mirror";
  if (variant === "normal" || variant === "sealed") return "normal";
  return "other";
}

function pickBestMatch(
  hareruya: CardIdentity,
  candidates: CardRushMatchEntry[],
  options: { requireRarity: boolean },
): CardRushMatchEntry | null {
  const scored = candidates
    .map((entry) => ({ entry, score: entryScore(hareruya, entry, options) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const bestScore = scored[0].score;
  const best = scored.filter((item) => item.score === bestScore);

  if (best.length === 1) return best[0].entry;

  const exactPack = best.filter((item) => {
    const hareruyaPack = normalizePackForMatch(hareruya.packCode);
    const cardrushPack = normalizePackForMatch(item.entry.identity.packCode);
    return hareruyaPack && cardrushPack && hareruyaPack === cardrushPack;
  });

  if (exactPack.length === 1) return exactPack[0].entry;

  const preferredSlot = variantToPriceSlot(hareruya.variant);
  const slotMatches = best.filter((item) => item.entry.priceSlot === preferredSlot);
  if (slotMatches.length === 1) return slotMatches[0].entry;

  return null;
}

export function buildCardRushMatchIndex(rows: CardRushRawRow[]): Map<string, CardRushMatchEntry[]> {
  const byModel = new Map<string, CardRushMatchEntry[]>();

  for (const row of rows) {
    const identity = parseCardRushIdentity(row);
    if (!identity) continue;

    const entry: CardRushMatchEntry = {
      identity,
      price: row.price,
      priceSlot: detectCardRushVariant(row),
    };

    const bucket = byModel.get(identity.modelNumber) ?? [];
    bucket.push(entry);
    byModel.set(identity.modelNumber, bucket);
  }

  return byModel;
}

export function findCardRushMatch(
  hareruya: CardIdentity,
  index: Map<string, CardRushMatchEntry[]>,
): CardRushMatchEntry | null {
  const candidates = index.get(hareruya.modelNumber) ?? [];
  if (candidates.length === 0) return null;

  return (
    pickBestMatch(hareruya, candidates, { requireRarity: true }) ??
    pickBestMatch(hareruya, candidates, { requireRarity: false })
  );
}
