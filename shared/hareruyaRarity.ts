import type { MirrorVariantLabel } from "./hareruyaPack";

const MIRROR_LABELS: MirrorVariantLabel[] = [
  "マスターボールミラー",
  "モンスターボールミラー",
  "エネルギーミラー",
  "R団ミラー",
  "ボールミラー",
  "ミラー",
];

const KEPT_NAME_PARENTHETICALS = new Set<string>(["未開封", ...MIRROR_LABELS]);

const MULTI_CHAR_RARITY_TOKENS = new Set([
  "sr",
  "rr",
  "ar",
  "sar",
  "ur",
  "csr",
  "chr",
  "ace",
  "hr",
  "tr",
  "promo",
  "rr☆",
  "rr★",
]);

const SINGLE_CHAR_RARITY_TOKENS = new Set(["r", "u", "c", "k"]);

export function normalizeRarity(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.normalize("NFKC").trim();
  if (!trimmed) return null;
  return trimmed.replace(/＿/g, "_");
}

function normalizeRarityQuery(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/＿/g, "_");
}

export function isRarityLabelToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (KEPT_NAME_PARENTHETICALS.has(trimmed)) return false;
  if (trimmed.includes("ミラー")) return false;
  if (trimmed.includes("未開封")) return false;
  if (trimmed.includes("仕様")) return false;
  return true;
}

export function extractHareruyaRarityFromPrefix(prefix: string): {
  rarity: string | null;
  rest: string;
} {
  let rarity: string | null = null;
  let rest = prefix;

  rest = rest.replace(/\(([^)]*)\)\{[^}]*\}/g, (match, inner: string) => {
    const token = inner.trim();
    if (isRarityLabelToken(token)) {
      rarity = rarity ?? token;
      return "";
    }
    return match;
  });

  const trailing = rest.match(/^(.+?)\(([^)]+)\)\s*$/);
  if (trailing) {
    const [, base, inner] = trailing;
    const token = inner.trim();
    if (!KEPT_NAME_PARENTHETICALS.has(token) && isRarityLabelToken(token)) {
      rarity = rarity ?? token;
      rest = base.trim();
    }
  }

  return { rarity: normalizeRarity(rarity), rest };
}

export function extractHareruyaRarityFromTitle(title: string): string | null {
  const normalized = title.normalize("NFKC").trim();
  const prefixMatch = /^(.+?)〈/.exec(normalized);
  if (!prefixMatch) return null;
  return extractHareruyaRarityFromPrefix(prefixMatch[1]).rarity;
}

export function isRaritySearchToken(token: string): boolean {
  const normalized = normalizeRarityQuery(token);
  if (!normalized) return false;
  if (MULTI_CHAR_RARITY_TOKENS.has(normalized)) return true;
  if (SINGLE_CHAR_RARITY_TOKENS.has(normalized)) return true;
  if (normalized === "☆" || normalized === "★" || normalized === "-") return true;
  return false;
}

export function rarityMatches(rarity: string | null, token: string): boolean {
  if (!rarity) return false;

  const entry = normalizeRarityQuery(rarity);
  const query = normalizeRarityQuery(token);
  if (!entry || !query) return false;

  const normalizeStars = (value: string) => value.replace(/☆/g, "★");
  return normalizeStars(entry) === normalizeStars(query);
}

export function raritySearchText(rarity: string | null): string {
  if (!rarity) return "";
  return normalizeRarityQuery(rarity);
}
