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
    label: "subset pack suffix XY8-b",
    hareruya: "MオニゴーリEX(RR){水}〈015/059〉[XY8-b]",
    cardrush: {
      name: "MオニゴーリEX",
      pack: "XY8",
      rarity: "RR",
      modelNumber: "015/059",
      price: 3000,
      extraDifference: "",
    },
  },
  {
    label: "promo pack BW-P preserved",
    hareruya: "ボーマンダ〈195/BW-P〉[BW-P]",
    cardrush: {
      name: "ボーマンダ",
      pack: "BW-P",
      rarity: "P",
      modelNumber: "195/BW-P",
      price: 1200,
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
  {
    label: "M2a quick ball mirror -> ball mirror",
    hareruya: "コダック:ボールミラー(-){水}〈032/193〉[M2a-BM]",
    cardrush: {
      name: "コダック",
      pack: "M2a",
      rarity: "-",
      modelNumber: "032/193",
      price: 50,
      extraDifference: "クイックボールミラー",
    },
  },
  {
    label: "M2a dragon energy mirror -> energy mirror",
    hareruya: "レックウザ:エネルギーミラー(-){ドラゴン}〈128/193〉[M2a-EM]",
    cardrush: {
      name: "レックウザ",
      pack: "M2a",
      rarity: "-",
      modelNumber: "128/193",
      price: 80,
      extraDifference: "竜エネルギーミラー",
    },
  },
  {
    label: "non-M2a quick ball mirror held",
    hareruya: "コダック:ボールミラー(-){水}〈032/193〉[M2a-BM]",
    cardrush: {
      name: "コダック",
      pack: "SV2a",
      rarity: "-",
      modelNumber: "032/193",
      price: 50,
      extraDifference: "クイックボールミラー",
    },
    shouldMatch: false,
  },
  {
    label: "M2a monster ball mirror on CR matches hareruya ball mirror",
    hareruya: "Nのゼクロム:ボールミラー(-){ドラゴン}〈129/193〉[M2a-BM]",
    cardrush: {
      name: "Nのゼクロム",
      pack: "M2a",
      rarity: "-",
      modelNumber: "129/193",
      price: 120,
      extraDifference: "モンスターボールミラー",
    },
  },
  {
    label: "M2a hareruya monster ball mirror still exact match",
    hareruya: "Nのゼクロム:モンスターボールミラー(-){ドラゴン}〈129/193〉[M2a-Mo]",
    cardrush: {
      name: "Nのゼクロム",
      pack: "M2a",
      rarity: "-",
      modelNumber: "129/193",
      price: 120,
      extraDifference: "モンスターボールミラー",
    },
  },
  {
    label: "underscore full/half width",
    hareruya: "_のレックウザ(PROMO){ドラゴン}〈021/PLAY〉[P-P]",
    cardrush: {
      name: "＿のレックウザ",
      pack: "P-P",
      rarity: "P",
      modelNumber: "021/PLAY",
      price: 5000,
      extraDifference: "",
    },
  },
  {
    label: "ignore spaces in card name",
    hareruya: "ボスごっこピカチュウロケット団(PROMO){雷}〈191/SM-P〉[SM-P]",
    cardrush: {
      name: "ボスごっこピカチュウ ロケット団",
      pack: "SM-P",
      rarity: "P",
      modelNumber: "191/SM-P",
      price: 800,
      extraDifference: "",
    },
  },
  {
    label: "pack case insensitive",
    hareruya: "アローラキュウコンGX(RR){炎}〈025/050〉[SM7b]",
    cardrush: {
      name: "アローラキュウコンGX",
      pack: "sm7b",
      rarity: "RR",
      modelNumber: "025/050",
      price: 200,
      extraDifference: "",
    },
  },
  {
    label: "hareruya p suffix equals CR plus",
    hareruya: "アーゴヨンGX(RR){超}〈058/050〉[SM5p]",
    cardrush: {
      name: "アーゴヨンGX",
      pack: "sm5+",
      rarity: "RR",
      modelNumber: "058/050",
      price: 3000,
      extraDifference: "",
    },
  },
  {
    label: "prefer opened CR over sealed",
    hareruya: "シャワーズ☆(PROMO){雷}〈022/PLAY〉[P-P]",
    cardrush: [
      {
        name: "シャワーズ☆",
        pack: "P-P",
        rarity: "-",
        modelNumber: "022/PLAY",
        price: 500000,
        extraDifference: "未開封",
      },
      {
        name: "シャワーズ☆",
        pack: "P-P",
        rarity: "-",
        modelNumber: "022/PLAY",
        price: 2000000,
        extraDifference: "",
      },
    ],
    expectedPrice: 2000000,
  },
  {
    label: "match CR sealed when no opened row",
    hareruya: "シャワーズ☆(PROMO){雷}〈022/PLAY〉[P-P]",
    cardrush: {
      name: "シャワーズ☆",
      pack: "P-P",
      rarity: "-",
      modelNumber: "022/PLAY",
      price: 500000,
      extraDifference: "未開封",
    },
    expectedPrice: 500000,
  },
];

let failed = 0;

import type { CardRushRawRow } from "../server/fetch/cardrush";

type CardRushSample = Omit<CardRushRawRow, "rarity"> & { rarity: string };

for (const sample of samples) {
  const hId = parseHareruyaIdentity(sample.hareruya);
  const cardrushRows = (Array.isArray(sample.cardrush) ? sample.cardrush : [sample.cardrush]).map(
    (row) => ({ ...row, rarity: row.rarity }) as CardRushRawRow,
  );
  const index = buildCardRushMatchIndex(cardrushRows);
  const match = hId ? findCardRushMatch(hId, index) : null;
  const shouldMatch = sample.shouldMatch !== false;
  const priceOk =
    sample.expectedPrice === undefined || match?.price === sample.expectedPrice;
  const ok = shouldMatch ? Boolean(match) && priceOk : !match;

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
