import { buildComparisonItems } from "../server/compare";
import { normalizeCardRushRows, normalizeHareruyaRows } from "../server/normalize";

const hareruyaRows = [
  { name: "リーリエのピッピex(-){超}〈287/742〉[MC]", price: 950, series: null },
  { name: "リーリエのピッピex:ミラー(-){超}〈287/742〉[MC-M]", price: 250, series: null },
];

const cardrushRows = [
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
];

const items = buildComparisonItems(
  normalizeHareruyaRows(hareruyaRows),
  normalizeCardRushRows(cardrushRows),
);

const regular = items.find((item) => item.name === "リーリエのピッピex〈287/742〉[MC]");
const mirror = items.find((item) => item.name === "リーリエのピッピex (ミラー)〈287/742〉[MC]");

const ok =
  regular?.cardrush === 1000 &&
  regular.diff === -50 &&
  mirror?.cardrush === 50 &&
  mirror.diff === 200;

console.log(ok ? "OK" : "NG", "variant matching");
if (regular) console.log("regular", regular.cardrush, regular.diff);
if (mirror) console.log("mirror", mirror.cardrush, mirror.diff);

if (!ok) process.exit(1);
