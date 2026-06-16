import Fuse from "fuse.js";
import { buildSearchIndex, normalizeSearchText, tokenizeQuery, scoreEntry } from "../src/utils/search";
import type { ComparisonItem } from "../src/types";
import { readFileSync } from "node:fs";

const data = JSON.parse(
  readFileSync(new URL("../public/data/comparison.json", import.meta.url), "utf-8"),
) as { items: ComparisonItem[] };

const index = buildSearchIndex(data.items);

function fullSearch(query: string): string[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return index.map((e) => e.item.name);

  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((r) => r.entry.item.name);
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
  });

  return fuse
    .search(tokens.join(" "))
    .slice(0, 3)
    .map((r) => r.item.item.name);
}

for (const q of ["rizado", "rizardon", "pikachu", "gennga", "ririe"]) {
  console.log(`\n[${q}] norm=${normalizeSearchText(q)}`);
  for (const hit of fullSearch(q)) console.log(" ", hit);
}
