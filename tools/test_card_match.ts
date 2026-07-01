import { buildComparisonItems } from "../server/compare";
import {
  parseHareruyaIdentity,
  findCardRushMatch,
  buildCardRushMatchIndex,
} from "../server/cardMatch";
import { normalizeHareruyaRows } from "../server/normalize";

const samples = [
  {
    label: "rayquaza AD3",
    hareruya: "レックウザex(☆){無}〈047/054〉[AD3]",
    cardrush: {
      name: "レックウザex",
      pack: "AD3",
      rarity: "☆",
      modelNumber: "047/054",
      price: 55000,
      extraDifference: "",
    },
  },
  {
    label: "AZ mirror XY",
    hareruya: "AZ (ミラー)〈138/171〉[XY/171]",
    cardrush: {
      name: "AZ",
      pack: "XY",
      rarity: "R",
      modelNumber: "138/171",
      price: 100,
      extraDifference: "ミラー",
    },
  },
  {
    label: "G scope no pack on CR",
    hareruya: "Gスコープ〈074/076〉[BW9]",
    cardrush: {
      name: "Gスコープ",
      pack: "その他",
      rarity: "R",
      modelNumber: "074/076",
      price: 10,
      extraDifference: "",
    },
  },
  {
    label: "case sensitive ex",
    hareruya: "ピカチュウex〈025/165〉[SV2a]",
    cardrush: {
      name: "ピカチュウEX",
      pack: "SV2a",
      rarity: "AR",
      modelNumber: "025/165",
      price: 100,
      extraDifference: "",
    },
    shouldMatch: false,
  },
];

let failed = 0;

for (const sample of samples) {
  const hId = parseHareruyaIdentity(sample.hareruya);
  const index = buildCardRushMatchIndex([
    {
      ...sample.cardrush,
      rarity: sample.cardrush.rarity,
    } as import("../server/fetch/cardrush").CardRushRawRow,
  ]);
  const match = hId ? findCardRushMatch(hId, index) : null;
  const shouldMatch = sample.shouldMatch !== false;
  const ok = shouldMatch ? Boolean(match) : !match;

  if (!ok) {
    failed += 1;
    console.error("NG", sample.label, { hId, match: match?.price });
  } else {
    console.log("OK", sample.label, match?.price ?? "no match");
  }
}

const variantItems = buildComparisonItems(
  normalizeHareruyaRows([
    { name: "リーリエのピッピex(-){超}〈287/742〉[MC]", price: 950, series: null },
    { name: "リーリエのピッピex:ミラー(-){超}〈287/742〉[MC-M]", price: 250, series: null },
  ]),
  [
    {
      name: "リーリエのピッピex",
      pack: "MC",
      rarity: "-",
      modelNumber: "287/742",
      price: 1000,
      extraDifference: "ノーマル仕様",
    },
    {
      name: "リーリエのピッピex",
      pack: "MC",
      rarity: "-",
      modelNumber: "287/742",
      price: 50,
      extraDifference: "ミラー",
    },
  ],
);

const regular = variantItems.find((item) => item.name === "リーリエのピッピex〈287/742〉[MC]");
const mirror = variantItems.find((item) => item.name === "リーリエのピッピex (ミラー)〈287/742〉[MC]");

if (
  !regular ||
  regular.cardrush !== 1000 ||
  !mirror ||
  mirror.cardrush !== 50
) {
  console.error("NG variant matching", regular, mirror);
  failed += 1;
} else {
  console.log("OK variant matching");
}

if (failed > 0) process.exit(1);

console.log("OK card match tests");
