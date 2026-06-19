import { fetchCardImage, isExactProductMatch } from "../server/hareruya";

const cases = [
  {
    name: "ラプラス (マスターボールミラー)〈131/165〉[SV2a]",
    expectedTitleIncludes: ["マスターボールミラー", "[SV2a-Ma]"],
    forbiddenTitleIncludes: ["モンスターボールミラー", "[SV2a-Mo]"],
  },
  {
    name: "ラプラス (モンスターボールミラー)〈131/165〉[SV2a]",
    expectedTitleIncludes: ["モンスターボールミラー", "[SV2a-Mo]"],
    forbiddenTitleIncludes: ["マスターボールミラー", "[SV2a-Ma]"],
  },
  {
    name: "フシギダネ (モンスターボールミラー)〈001/165〉[SV2a]",
    expectedTitleIncludes: ["モンスターボールミラー", "[SV2a-Mo]"],
    forbiddenTitleIncludes: ["マスターボールミラー"],
  },
  {
    name: "ヒトカゲ〈168/165〉[SV2a]",
    expectedTitleIncludes: ["ヒトカゲ", "[SV2a]"],
    forbiddenTitleIncludes: ["ミラー", "-Ma", "-Mo"],
  },
  {
    name: "レックウザ (ボールミラー)〈127/193〉[M2a]",
    expectedTitleIncludes: ["ボールミラー", "[M2a-BM]"],
    forbiddenTitleIncludes: ["マスターボールミラー", "モンスターボールミラー"],
  },
  {
    name: "レックウザ (マスターボールミラー)〈127/193〉[M2a]",
    expectNoImage: true,
  },
];

async function main(): Promise<void> {
  let failed = 0;

  for (const testCase of cases) {
    const result = await fetchCardImage(testCase.name, { refresh: true });
    const title = result.productTitle ?? "";

    console.log("---");
    console.log("input:", testCase.name);
    console.log("query:", result.searchQuery);
    console.log("title:", title || "(none)");
    console.log("image:", result.imageUrl ? "yes" : "no");

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

  const looseCases = [
    [
      "ラプラス (マスターボールミラー)〈131/165〉[SV2a]",
      "ラプラス:モンスターボールミラー(U){水}〈131/165〉[SV2a-Mo]",
    ],
    [
      "ラプラス (マスターボールミラー)〈131/165〉[SV2a]",
      "ラプラス(U){水}〈131/165〉[SV2a]",
    ],
    [
      "ヒトカゲ〈168/165〉[SV2a]",
      "ヒトカゲ:モンスターボールミラー(C){炎}〈168/165〉[SV2a-Mo]",
    ],
  ] as const;

  for (const [cardName, title] of looseCases) {
    if (isExactProductMatch(cardName, title)) {
      console.error("NG loose match accepted:", cardName, "<-", title);
      failed += 1;
    }
  }

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\nOK strict card image matching");
}

void main();
