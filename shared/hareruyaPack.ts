export type MirrorVariantLabel =
  | "マスターボールミラー"
  | "モンスターボールミラー"
  | "エネルギーミラー"
  | "R団ミラー"
  | "ボールミラー"
  | "ミラー";

const MIRROR_VARIANT_PACK_SUFFIX: Record<MirrorVariantLabel, string> = {
  マスターボールミラー: "-Ma",
  モンスターボールミラー: "-Mo",
  エネルギーミラー: "-EM",
  R団ミラー: "-RM",
  ボールミラー: "-BM",
  ミラー: "-M",
};

const PACK_VARIANT_SUFFIX_PATTERN = /(?:-Ma|-Mo|-EM|-BM|-RM|-M)$/;

/** 比較表などで使うベースパック（例: SV2a-Ma → SV2a） */
export function normalizeHareruyaPackCode(packCode: string): string {
  if (packCode.endsWith("-Ma") || packCode.endsWith("-Mo")) {
    return packCode.slice(0, -3);
  }
  if (packCode.endsWith("-M")) {
    return packCode.slice(0, -2);
  }
  if (/(?:-EM|-BM|-RM)$/.test(packCode)) {
    return packCode.slice(0, packCode.lastIndexOf("-"));
  }

  return packCode;
}

/** カード名からミラー種別を検出 */
export function detectMirrorVariantLabel(cardName: string): MirrorVariantLabel | null {
  const normalized = cardName.replace(/:/g, " ");
  const prefix = normalized.split("〈")[0] ?? normalized;

  if (prefix.includes("マスターボールミラー")) return "マスターボールミラー";
  if (prefix.includes("モンスターボールミラー")) return "モンスターボールミラー";
  if (prefix.includes("エネルギーミラー")) return "エネルギーミラー";
  if (prefix.includes("R団ミラー")) return "R団ミラー";
  if (prefix.includes("ボールミラー")) return "ボールミラー";
  if (/\(ミラー\)/.test(prefix)) return "ミラー";

  return null;
}

/** 晴れる屋2のパック表記（例: SV2a + マスターボールミラー → SV2a-Ma） */
export function buildHareruyaVariantPackCode(
  basePack: string,
  variant: MirrorVariantLabel,
): string {
  return `${basePack}${MIRROR_VARIANT_PACK_SUFFIX[variant]}`;
}

/** POP・ツイート・買取表向けの [] 内パック表記 */
export function resolveHareruyaDisplayPackCode(sourceName: string, packInBrackets: string): string {
  const trimmed = packInBrackets.trim();
  if (!trimmed) return trimmed;

  if (PACK_VARIANT_SUFFIX_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const variant = detectMirrorVariantLabel(sourceName);
  if (variant) {
    return buildHareruyaVariantPackCode(normalizeHareruyaPackCode(trimmed), variant);
  }

  return normalizeHareruyaPackCode(trimmed);
}
