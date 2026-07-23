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
    label: "TAG team half/fullwidth amp",
    hareruya: "ミュウツー&ミュウGX(RR){超}〈029/094〉[SM11]",
    cardrush: {
      name: "ミュウツー＆ミュウGX",
      pack: "sm11",
      rarity: "RR",
      modelNumber: "029/094",
      price: 6200,
      extraDifference: "",
    },
    expectedPrice: 6200,
  },
  {
    label: "TAG team :SA matches CR extra SA",
    hareruya: "ラティアス&ラティオスGX:SA(SR){超}〈105/095〉[SM9]",
    cardrush: {
      name: "ラティアス＆ラティオスGX",
      pack: "sm9",
      rarity: "SR",
      modelNumber: "105/095",
      price: 400000,
      extraDifference: "SA",
    },
    expectedPrice: 400000,
  },
  {
    label: "TAG :SA does not match non-SA row",
    hareruya: "ラティアス&ラティオスGX:SA(SR){超}〈105/095〉[SM9]",
    cardrush: {
      name: "ラティアス＆ラティオスGX",
      pack: "sm9",
      rarity: "SR",
      modelNumber: "105/095",
      price: 11000,
      extraDifference: "",
    },
    shouldMatch: false,
  },
  {
    label: "prefer CR SA when H2 has :SA among candidates",
    hareruya: "ピカチュウ&ゼクロムGX:SA(SR){雷}〈101/095〉[SM9]",
    cardrush: [
      {
        name: "ピカチュウ＆ゼクロムGX",
        pack: "sm9",
        rarity: "SR",
        modelNumber: "101/095",
        price: 24000,
        extraDifference: "",
      },
      {
        name: "ピカチュウ＆ゼクロムGX",
        pack: "sm9",
        rarity: "SR",
        modelNumber: "101/095",
        price: 260000,
        extraDifference: "SA",
      },
    ],
    expectedPrice: 260000,
  },
  {
    label: "Solgaleo Lunala H2 without :SA matches CR SA-only row",
    hareruya: "ソルガレオ&ルナアーラGX(SR){超}〈063/049〉[SM11b]",
    cardrush: {
      name: "ソルガレオ＆ルナアーラGX",
      pack: "sm11b",
      rarity: "SR",
      modelNumber: "063/049",
      price: 43000,
      extraDifference: "SA",
    },
    expectedPrice: 43000,
  },
  {
    label: "Reshiram Zekrom HR without :SA matches CR SA",
    hareruya: "レシラム&ゼクロムGX(HR){ドラゴン}〈071/049〉[SM11b]",
    cardrush: {
      name: "レシラム＆ゼクロムGX",
      pack: "sm11b",
      rarity: "HR",
      modelNumber: "071/049",
      price: 17000,
      extraDifference: "SA",
    },
    expectedPrice: 17000,
  },
  {
    label: "Eevee Snorlax promo model priority over pack+SA",
    hareruya: "イーブイ&カビゴンGX(PROMO){無}〈297/SM-P〉[SM-P]",
    cardrush: {
      name: "イーブイ＆カビゴンGX",
      pack: "sm9",
      rarity: "P",
      modelNumber: "297/SM-P",
      price: 32000,
      extraDifference: "SA",
    },
    expectedPrice: 32000,
  },
  {
    label: ":SAR仕様 is not treated as :SA",
    hareruya: "ピカチュウex:SAR仕様(-){雷}〈764/742〉[MC]",
    cardrush: {
      name: "ピカチュウex",
      pack: "MC",
      rarity: "-",
      modelNumber: "764/742",
      price: 100,
      extraDifference: "SA",
    },
    shouldMatch: false,
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
