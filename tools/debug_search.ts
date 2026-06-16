import { readFileSync } from "node:fs";
import {
  buildSearchIndex,
  normalizeSearchText,
  scoreEntry,
  tokenizeQuery,
} from "../src/utils/search";

const data = JSON.parse(readFileSync("public/data/comparison.json", "utf8")) as {
  items: { name: string }[];
};

const index = buildSearchIndex(data.items);

function debug(query: string) {
  const tokens = tokenizeQuery(query);
  const hits = index.filter((e) => scoreEntry(e, tokens) >= 0);
  console.log(`\n=== ${query} => ${hits.length} (tokens: ${tokens.join("|")}) ===`);
  for (const e of hits.slice(0, 8)) {
    const reasons: string[] = [];
    for (const token of tokens) {
      if (e.searchText.includes(token)) reasons.push(`text:${token}`);
      if (normalizeSearchText(e.cardName).includes(token)) reasons.push(`name:${token}`);
      if (normalizeSearchText(e.pack).includes(token)) reasons.push(`pack:${e.pack}`);
      if (e.number.replace(/\//g, "").includes(token.replace(/\//g, "")))
        reasons.push(`num:${e.number}`);
    }
    console.log(`  ${e.item.name}`);
    console.log(`    ${[...new Set(reasons)].join(", ")}`);
  }
}

debug("リザードン M5");
debug("ミラー M2");
debug("M2");
debug("M2a");
debug("SAR");
debug("sar");
debug("未開封");
debug("CLL");
debug("ムク");
debug("メガダークライ");

const sarNames = data.items.filter((i) => /sar/i.test(i.name));
console.log("\nNames containing SAR:", sarNames.length);
for (const i of sarNames.slice(0, 5)) console.log(" ", i.name);
