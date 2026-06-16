import Fuse from "fuse.js";
import { readFileSync } from "node:fs";
import { buildSearchIndex, scoreEntry, shouldUseFuzzySearch, tokenizeQuery } from "../src/utils/search";
import type { ComparisonItem } from "../src/types";

const data = JSON.parse(readFileSync("public/data/comparison.json", "utf8")) as {
  items: ComparisonItem[];
};

const index = buildSearchIndex(data.items);

function search(query: string): { count: number; top: string[] } {
  const tokens = tokenizeQuery(query);
  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return {
      count: scored.length,
      top: scored.slice(0, 5).map((r) => r.entry.item.name),
    };
  }

  if (tokens.length > 1) {
    return { count: 0, top: [] };
  }

  if (!shouldUseFuzzySearch(tokens[0])) {
    return { count: 0, top: [] };
  }

  const fuse = new Fuse(index, {
    keys: [
      { name: "searchText", weight: 0.45 },
      { name: "cardName", weight: 0.3 },
      { name: "number", weight: 0.15 },
      { name: "pack", weight: 0.1 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  const fuseResults = fuse.search(tokens[0]);
  return {
    count: fuseResults.length,
    top: fuseResults.slice(0, 5).map((r) => r.item.item.name),
  };
}

const tests = [
  "リザードン",
  "リザードン M5",
  "M5 117",
  "117/081",
  "117081",
  "003/032",
  "003032",
  "CLL",
  "ピカチュウ",
  "rizado",
  "rizardon",
  "ぴかちゅう",
  "メガ",
  "ミラー",
  "ミラー M2",
  "ゼルネアス",
  "CP5",
  "SV4a",
  "晴れる屋",
  "40000",
  "¥40000",
  "差額",
  "ex",
  "EX",
  "VMAX",
  "未開封",
  "ボールミラー",
  "リーリエ",
  "決心",
  "sar",
  "SAR",
  "114/081",
];

console.log("Total items:", data.items.length);
for (const q of tests) {
  const result = search(q);
  console.log(`\n[${q}] => ${result.count}件`);
  for (const name of result.top) {
    console.log("  ", name);
  }
  if (result.count === 0) console.log("  (NO RESULTS)");
}

// Sample names that might fail parsing
const unparsed = data.items.filter((i) => !/〈[^〉]+〉\[[^\]]+\]$/.test(i.name));
console.log("\nUnparsed name format:", unparsed.length);
for (const item of unparsed.slice(0, 10)) {
  console.log(" ", item.name);
}
