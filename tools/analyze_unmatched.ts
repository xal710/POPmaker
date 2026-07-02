import { writeFileSync } from "node:fs";

import { buildComparisonResult } from "../server/compare";
import {
  buildCardRushMatchIndex,
  findCardRushMatch,
  hasCardRushModel,
  parseHareruyaIdentity,
  type CardRushMatchEntry,
} from "../server/cardMatch";
import { fetchCardRushBuyPrices } from "../server/fetch/cardrush";
import { fetchHareruyaBuyPrices } from "../server/fetch/hareruya";
import { normalizeHareruyaRows } from "../server/normalize";

interface UnmatchedReasonCounts {
  noIdentity: number;
  excludedNoHareruyaModel: number;
  excludedNoModelOnCr: number;
  noMatchWithCandidates: number;
  recoverablePackLessUnique: number;
  recoverableMirrorName: number;
  samplePackLess: string[];
  sampleMirrorName: string[];
}

function countRecoverableMatches(
  unmatchedHareruya: Array<[string, { rawName: string }]>,
  index: Map<string, CardRushMatchEntry[]>,
): Pick<
  UnmatchedReasonCounts,
  "recoverablePackLessUnique" | "recoverableMirrorName" | "samplePackLess" | "sampleMirrorName"
> {
  let recoverablePackLessUnique = 0;
  let recoverableMirrorName = 0;
  const samplePackLess: string[] = [];
  const sampleMirrorName: string[] = [];

  for (const [displayName, entry] of unmatchedHareruya) {
    const identity = parseHareruyaIdentity(entry.rawName);
    if (!identity || identity.modelNumber === "-") continue;

    const candidates = (index.get(identity.modelNumber) ?? []).filter((candidate) => {
      if (candidate.identity.baseName !== identity.baseName) return false;
      if (candidate.identity.variant !== identity.variant) return false;
      return true;
    });

    if (candidates.length === 1 && identity.packCode && !candidates[0].identity.packCode) {
      recoverablePackLessUnique += 1;
      if (samplePackLess.length < 8) samplePackLess.push(displayName);
    }

    if (identity.variant === "ミラー" && identity.baseName.endsWith("")) {
      const plainName = identity.baseName;
      const mirrorCandidates = (index.get(identity.modelNumber) ?? []).filter((candidate) => {
        const plain = candidate.identity.baseName.replace(/ \(ミラー\)$/, "");
        return plain === identity.baseName && candidate.identity.variant === identity.variant;
      });
      if (mirrorCandidates.length === 1 && candidates.length === 0) {
        recoverableMirrorName += 1;
        if (sampleMirrorName.length < 8) sampleMirrorName.push(displayName);
      }
    }

    if (displayName.includes("(ミラー)") && candidates.length === 0) {
      const withoutMirrorLabel = displayName.replace(" (ミラー)", "");
      const altIdentity = parseHareruyaIdentity(withoutMirrorLabel);
      if (altIdentity && findCardRushMatch(altIdentity, index)) {
        recoverableMirrorName += 1;
        if (sampleMirrorName.length < 8 && !sampleMirrorName.includes(displayName)) {
          sampleMirrorName.push(displayName);
        }
      }
    }
  }

  return {
    recoverablePackLessUnique,
    recoverableMirrorName,
    samplePackLess,
    sampleMirrorName,
  };
}

async function main(): Promise<void> {
  console.log("Fetching Hareruya + CardRush...");
  const [hareruyaResult, cardrushResult] = await Promise.all([
    fetchHareruyaBuyPrices((message) => {
      console.log(message);
    }),
    fetchCardRushBuyPrices((message) => {
      console.log(message);
    }),
  ]);

  const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
  const { items, unmatchedHareruya: comparableUnmatched } = buildComparisonResult(
    hareruyaMap,
    cardrushResult.rows,
  );
  const index = buildCardRushMatchIndex(cardrushResult.rows);

  const matchedNames = new Set(items.map((item) => item.name));
  const allUnmatchedHareruya = [...hareruyaMap.entries()].filter(([name]) => !matchedNames.has(name));

  const reasons: UnmatchedReasonCounts = {
    noIdentity: 0,
    excludedNoHareruyaModel: 0,
    excludedNoModelOnCr: 0,
    noMatchWithCandidates: 0,
    recoverablePackLessUnique: 0,
    recoverableMirrorName: 0,
    samplePackLess: [],
    sampleMirrorName: [],
  };

  const samples: Array<{ hareruya: string; reason: string }> = [];

  for (const [displayName, entry] of allUnmatchedHareruya) {
    const identity = parseHareruyaIdentity(entry.rawName);
    if (!identity) {
      reasons.noIdentity += 1;
      continue;
    }

    if (identity.modelNumber.trim() === "" || identity.modelNumber.trim() === "-") {
      reasons.excludedNoHareruyaModel += 1;
      continue;
    }

    const candidates = index.get(identity.modelNumber) ?? [];
    if (!hasCardRushModel(index, identity.modelNumber)) {
      reasons.excludedNoModelOnCr += 1;
      continue;
    }

    const match = findCardRushMatch(identity, index);
    if (!match) {
      reasons.noMatchWithCandidates += 1;
      if (samples.length < 12) {
        samples.push({ hareruya: displayName, reason: "候補はあるがパック/レアリティ/ミラーで不一致" });
      }
    }
  }

  const recoverable = countRecoverableMatches(comparableUnmatched.map((item) => [
    item.name,
    { rawName: item.hareruyaTitle ?? item.name },
  ] as [string, { rawName: string }]), index);
  Object.assign(reasons, recoverable);

  const summary = {
    hareruyaNormalized: hareruyaMap.size,
    cardrushRows: cardrushResult.rows.length,
    matched: items.length,
    matchRatePercent: Number(((items.length / hareruyaMap.size) * 100).toFixed(1)),
    unmatchedHareruya: comparableUnmatched.length,
    excludedNoHareruyaModel: reasons.excludedNoHareruyaModel,
    excludedNoModelOnCr: reasons.excludedNoModelOnCr,
    allUnmatchedHareruya: allUnmatchedHareruya.length,
    reasons,
    samples,
    analyzedAt: new Date().toISOString(),
  };

  writeFileSync("tools/unmatched_analysis.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

void main();
