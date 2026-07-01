import { writeFileSync } from "node:fs";

import { buildComparisonItems } from "../server/compare";
import {
  buildCardRushMatchIndex,
  findCardRushMatch,
  parseHareruyaIdentity,
} from "../server/cardMatch";
import { fetchCardRushBuyPrices } from "../server/fetch/cardrush";
import { fetchHareruyaBuyPrices } from "../server/fetch/hareruya";
import { normalizeHareruyaRows } from "../server/normalize";

async function main(): Promise<void> {
  const [hareruyaResult, cardrushResult] = await Promise.all([
    fetchHareruyaBuyPrices(),
    fetchCardRushBuyPrices(),
  ]);

  const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
  const items = buildComparisonItems(hareruyaMap, cardrushResult.rows);
  const index = buildCardRushMatchIndex(cardrushResult.rows);

  const matchedNames = new Set(items.map((item) => item.name));
  const unmatchedHareruya = [...hareruyaMap.entries()].filter(([name]) => !matchedNames.has(name));

  let noIdentity = 0;
  let noCardrush = 0;
  const samples: Array<{ hareruya: string; reason: string }> = [];

  for (const [displayName, entry] of unmatchedHareruya) {
    const identity = parseHareruyaIdentity(entry.rawName);
    if (!identity) {
      noIdentity += 1;
      continue;
    }

    const match = findCardRushMatch(identity, index);
    if (!match) {
      noCardrush += 1;
      if (samples.length < 12) {
        samples.push({ hareruya: displayName, reason: "構造化照合で候補なし" });
      }
    }
  }

  const summary = {
    hareruyaNormalized: hareruyaMap.size,
    cardrushRows: cardrushResult.rows.length,
    matched: items.length,
    matchRatePercent: Number(((items.length / hareruyaMap.size) * 100).toFixed(1)),
    unmatchedHareruya: unmatchedHareruya.length,
    noIdentity,
    noCardrush,
    samples,
  };

  writeFileSync("tools/unmatched_analysis.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

void main();
