import { writeFileSync } from "node:fs";
import { buildComparisonResult } from "../server/compare";
import { fetchCardRushBuyPrices } from "../server/fetch/cardrush";
import { fetchHareruyaBuyPrices } from "../server/fetch/hareruya";
import { normalizeCardRushRows, normalizeHareruyaRows } from "../server/normalize";
import { saveComparisonPayload } from "../server/refreshComparison";

console.log("Fetching web data...");
const hareruyaResult = await fetchHareruyaBuyPrices();
const cardrushResult = await fetchCardRushBuyPrices();

const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
const { items, unmatchedHareruya } = buildComparisonResult(hareruyaMap, cardrushResult.rows);

saveComparisonPayload({
  updatedAt: new Date().toISOString(),
  source: "web",
  excelPath: null,
  excelModifiedAt: null,
  dataDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
  hareruyaBuyListUpdatedAt: hareruyaResult.pageUpdatedAt,
  items,
  unmatchedHareruya,
});

writeFileSync(
  "tools/refresh_result.json",
  JSON.stringify({ count: items.length, top10: items.slice(0, 10) }, null, 2),
);

console.log(`Updated comparison.json (${items.length} matched, ${unmatchedHareruya.length} unmatched)`);
console.log("\nTop 10:");
for (const [index, item] of items.slice(0, 10).entries()) {
  console.log(
    `${index + 1}. ${item.name} | CR=${item.cardrush} H2=${item.hareruya2} diff=${item.diff}`,
  );
}
