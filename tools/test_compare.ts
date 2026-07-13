import { buildComparisonResult } from "../server/compare";
import { normalizeHareruyaRows } from "../server/normalize";

const hareruyaMap = normalizeHareruyaRows([
  { name: "ピカチュウ〈025/165〉[SV2a]", price: 100, series: null },
  { name: "存在しないカード〈999/999〉[XX1]", price: 200, series: null },
  { name: "リーリエのピッピex:ミラー(-){超}〈287/742〉[MC-M]", price: 50, series: null },
  { name: "GR団のミュウツー(PROMO){超}〈-〉[neo-P]", price: 5000, series: null },
]);

const cardrushRows = [
  {
    name: "ピカチュウ",
    pack: "SV2a",
    rarity: "AR",
    modelNumber: "025/165",
    price: 80,
    extraDifference: "",
    ochaProductId: 1001,
  },
  {
    name: "リーリエのピッピex",
    pack: "MC",
    rarity: "-",
    modelNumber: "287/742",
    price: 30,
    extraDifference: "ノーマル仕様",
    ochaProductId: 1002,
  },
] as import("../server/fetch/cardrush").CardRushRawRow[];

const { items, unmatchedHareruya } = buildComparisonResult(hareruyaMap, cardrushRows);

let failed = 0;

if (items.length !== 1 || items[0]?.name !== "ピカチュウ〈025/165〉[SV2a]") {
  console.error("NG matched items", items);
  failed += 1;
} else {
  console.log("OK matched known model");
}

if (unmatchedHareruya.length !== 1) {
  console.error("NG unmatched count", unmatchedHareruya);
  failed += 1;
} else if (unmatchedHareruya[0]?.name !== "リーリエのピッピex (ミラー)〈287/742〉[MC]") {
  console.error("NG unmatched item", unmatchedHareruya[0]);
  failed += 1;
} else {
  console.log("OK unmatched only when CR has model");
}

const excludedNames = new Set([
  "存在しないカード〈999/999〉[XX1]",
  "GR団のミュウツー〈-〉[neo-P]",
]);
if (unmatchedHareruya.some((item) => excludedNames.has(item.name) || item.name.includes("〈-〉"))) {
  console.error("NG excluded cards appeared in unmatched", unmatchedHareruya);
  failed += 1;
} else {
  console.log("OK excluded no-model and no-CR-model cards");
}

if (failed > 0) process.exit(1);
console.log("OK compare tests");
