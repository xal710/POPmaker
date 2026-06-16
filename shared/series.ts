export const SERIES_OPTIONS = ["M", "SV", "S", "SM", "XY", "BW"] as const;
export type CardSeries = (typeof SERIES_OPTIONS)[number];

export const HARERUYA_URL_SERIES: Record<string, CardSeries> = {
  "buying-list-mega": "M",
  "buying-list-sv": "SV",
  "buying-list-ss": "S",
  "buying-list-sm": "SM",
  "buying-list-xy": "XY",
  "buying-list-bw": "BW",
};

/** パック記号の完全一致でシリーズを判定 */
const PACK_SERIES_EXACT: Record<string, CardSeries> = {
  EBB: "BW",
  SC: "BW",
  DS: "BW",
  PBG: "BW",
  PPD: "BW",
  MP1: "BW",
  SI: "S",
  SJ: "S",
  SK: "S",
  SF: "S",
  SO: "S",
  WAK: "S",
  MDB: "XY",
  BKR: "XY",
  Y30: "XY",
  MA: "XY",
  SEK: "SM",
  "20th": "SM",
};

/** 先頭一致（上から順に評価） */
const PACK_SERIES_PREFIX: ReadonlyArray<readonly [RegExp, CardSeries]> = [
  [/^SV/i, "SV"],
  [/^CL/i, "SV"],
  [/^SM/i, "SM"],
  [/^XY/i, "XY"],
  [/^CP/i, "XY"],
  [/^BW/i, "BW"],
  [/^MC$/i, "M"],
  [/^M\d/i, "M"],
  [/^S\d/i, "S"],
];

export function extractPackCode(name: string): string | null {
  const match = /\[([^\]]+)\]$/.exec(name);
  return match?.[1] ?? null;
}

export function detectSeriesFromPack(pack: string): CardSeries | null {
  const code = pack.trim();
  if (!code) return null;

  const exact = PACK_SERIES_EXACT[code];
  if (exact) return exact;

  for (const [pattern, series] of PACK_SERIES_PREFIX) {
    if (pattern.test(code)) return series;
  }

  return null;
}

export function resolveItemSeries(
  name: string,
  hareruyaSeries: CardSeries | null,
): CardSeries | undefined {
  const pack = extractPackCode(name);
  const fromPack = pack ? detectSeriesFromPack(pack) : null;
  if (fromPack) return fromPack;
  if (hareruyaSeries) return hareruyaSeries;
  return undefined;
}
