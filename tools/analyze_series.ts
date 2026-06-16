import { readFileSync } from "node:fs";
import { detectSeriesFromPack, resolveItemSeries } from "../shared/series.ts";

const data = JSON.parse(readFileSync("public/data/comparison.json", "utf8")) as {
  items: { name: string; series?: string }[];
};

const packCounts = new Map<string, number>();
const unclassified = new Map<string, number>();

for (const item of data.items) {
  const match = /\[([^\]]+)\]$/.exec(item.name);
  const pack = match?.[1] ?? "(none)";
  packCounts.set(pack, (packCounts.get(pack) ?? 0) + 1);

  const fromItem = resolveItemSeries(item.name, item.series ?? null);
  if (!fromItem) {
    unclassified.set(pack, (unclassified.get(pack) ?? 0) + 1);
  }
}

console.log("Total items:", data.items.length);
console.log("\nUnclassified packs:", unclassified.size);
const sorted = [...unclassified.entries()].sort((a, b) => b[1] - a[1]);
for (const [pack, count] of sorted.slice(0, 80)) {
  console.log(`${count}\t${pack}`);
}

console.log("\nCL packs:");
for (const [pack, count] of [...packCounts.entries()].filter(([p]) => /^CL/i.test(p)).sort()) {
  console.log(`${count}\t${pack}`);
}
