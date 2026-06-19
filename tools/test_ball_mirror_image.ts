import { fetchCardImage, isExactProductMatch, parseCardSearchQuery } from "../server/hareruya";
import { normalizeImageLookupKey } from "../server/normalize";

const cases = [
  {
    name: "ラプラス (マスターボールミラー)〈131/165〉[SV2a]",
    expectedTitleIncludes: ["マスターボールミラー", "[SV2a-Ma]"],
    forbiddenTitleIncludes: ["モンスターボールミラー"],
  },
  {
    name: "ラプラス (モンスターボールミラー)〈131/165〉[SV2a]",
    expectedTitleIncludes: ["モンスターボールミラー", "[SV2a-Mo]"],
    forbiddenTitleIncludes: ["マスターボールミラー"],
  },
  {
    name: "ゼルネアスEX〈038/036〉[CP5]",
    expectedTitleIncludes: ["ゼルネアス", "[CP5]"],
  },
  {
    name: "ムク〈117/081〉[M5]",
    expectedTitleIncludes: ["ムク", "[M5]"],
  },
  {
    name: "メガオーダイルex (ミラー)〈169/742〉[MC]",
    expectedTitleIncludes: ["ミラー", "[MC-M]"],
  },
  {
    name: "ミカルゲ (ミラー)〈071/093〉[EBB]",
    expectedTitleIncludes: ["ミラー", "[EBB"],
  },
  {
    name: "レックウザ (マスターボールミラー)〈127/193〉[M2a]",
    expectNoImage: true,
  },
];

const looseCases = [
  ["ラプラス (マスターボールミラー)〈131/165〉[SV2a]", "ラプラス:モンスターボールミラー(U){水}〈131/165〉[SV2a-Mo]"],
  ["ラプラス (マスターボールミラー)〈131/165〉[SV2a]", "ラプラス(U){水}〈131/165〉[SV2a]"],
  ["ムク〈117/081〉[M5]", "ピカチュウ(SAR){雷}〈117/081〉[M5]"],
] as const;

async function main(): Promise<void> {
  let failed = 0;

  for (const testCase of cases) {
    const t0 = Date.now();
    const result = await fetchCardImage(testCase.name, { refresh: true });
    const ms = Date.now() - t0;
    const title = result.productTitle ?? "";

    console.log("---");
    console.log("input:", testCase.name);
    console.log("query:", parseCardSearchQuery(testCase.name));
    console.log("ms:", ms);
    console.log("title:", title || "(none)");

    if (testCase.expectNoImage) {
      if (result.imageUrl) {
        console.error("NG expected no image");
        failed += 1;
      }
      continue;
    }

    if (!result.imageUrl) {
      console.error("NG expected image");
      failed += 1;
      continue;
    }

    for (const expected of testCase.expectedTitleIncludes ?? []) {
      if (!title.includes(expected)) {
        console.error("NG missing:", expected);
        failed += 1;
      }
    }

    for (const forbidden of testCase.forbiddenTitleIncludes ?? []) {
      if (title.includes(forbidden)) {
        console.error("NG forbidden:", forbidden);
        failed += 1;
      }
    }
  }

  for (const [cardName, title] of looseCases) {
    if (isExactProductMatch(cardName, title)) {
      console.error("NG loose match:", cardName, "<-", title);
      failed += 1;
    }
  }

  console.log("---");
  console.log("lookup sample:", normalizeImageLookupKey("ムク(SAR){サポート}〈117/081〉[M5]"));
  console.log("card sample:", normalizeImageLookupKey("ムク〈117/081〉[M5]"));

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\nOK image matching");
}

void main();
