import { buildComparisonItems } from "../server/compare";
import {
  buildCardRushSourceName,
  normalizeCardRushName,
  normalizeCardRushRows,
  normalizeHareruyaName,
  normalizeHareruyaRows,
} from "../server/normalize";

const hareruyaSamples = [
  "レックウザ:マスターボールミラー(SR){ドラゴン}〈127/193〉[M2a-Ma]",
  "レックウザ:モンスターボールミラー(SR){ドラゴン}〈127/193〉[M2a-Mo]",
  "レックウザ:ボールミラー(SR){ドラゴン}〈127/193〉[M2a-BM]",
];

console.log("=== Hareruya normalize ===");
for (const sample of hareruyaSamples) {
  console.log(normalizeHareruyaName(sample));
}

const cardrushSamples = [
  {
    name: "レックウザ",
    pack: "M2a",
    modelNumber: "127/193",
    price: 100,
    extraDifference: "マスターボールミラー",
  },
  {
    name: "レックウザ",
    pack: "M2a",
    modelNumber: "127/193",
    price: 80,
    extraDifference: "モンスターボールミラー",
  },
  {
    name: "レックウザ",
    pack: "M2a",
    modelNumber: "127/193",
    price: 60,
    extraDifference: "ボールミラー",
  },
];

console.log("\n=== Cardrush normalize ===");
for (const row of cardrushSamples) {
  const source = buildCardRushSourceName(row);
  console.log(row.extraDifference, "=>", normalizeCardRushName(source, row.pack, row.modelNumber));
}

const items = buildComparisonItems(
  normalizeHareruyaRows(hareruyaSamples.map((name, index) => ({ name, price: 1000 - index * 100, series: null }))),
  cardrushSamples,
);

console.log("\n=== Matched items ===");
for (const item of items) {
  console.log(item.name, "CR", item.cardrush, "H2", item.hareruya2);
}

const expected = [
  "レックウザ (マスターボールミラー)〈127/193〉[M2a]",
  "レックウザ (モンスターボールミラー)〈127/193〉[M2a]",
  "レックウザ (ボールミラー)〈127/193〉[M2a]",
];

const names = items.map((item) => item.name);
const ok = expected.every((name) => names.includes(name));

console.log(ok ? "\nOK" : "\nNG", "ball mirror matching");
if (!ok) process.exit(1);
