import { buildComparisonItems } from "../server/compare";
import { fetchCardRushBuyPrices } from "../server/fetch/cardrush";
import { fetchHareruyaBuyPrices } from "../server/fetch/hareruya";
import { normalizeCardRushRows, normalizeHareruyaRows } from "../server/normalize";

console.log("Fetching Hareruya...");
const hareruyaResult = await fetchHareruyaBuyPrices((m) => console.log(m));
console.log("Hareruya rows:", hareruyaResult.rows.length);
console.log("Hareruya page dates:", hareruyaResult.pageUpdatedAt);

console.log("Fetching Card Rush page 1 only test - full fetch next");
const cardrush = await fetchCardRushBuyPrices((m) => console.log(m));
console.log("Cardrush rows:", cardrush.rows.length);

const hareruyaMap = normalizeHareruyaRows(hareruyaResult.rows);
const cardrushMap = normalizeCardRushRows(cardrush.rows);
const items = buildComparisonItems(hareruyaMap, cardrushMap);

console.log("Normalized hareruya:", hareruyaMap.size);
console.log("Normalized cardrush:", cardrushMap.size);
console.log("Compared items:", items.length);
console.log("Top 5:");
for (const item of items.slice(0, 5)) {
  console.log(item.name, item.cardrush, item.hareruya2, item.diff);
}
