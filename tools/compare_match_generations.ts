import { buildCardRushMatchIndex, findCardRushMatch, parseHareruyaIdentity } from "../server/cardMatch";
import { fetchCardRushBuyPrices } from "../server/fetch/cardrush";
import { fetchHareruyaBuyPrices } from "../server/fetch/hareruya";
import {
  cardrushLookupKey,
  normalizeCardRushName,
  normalizeCardRushRows,
  normalizeHareruyaName,
  normalizeHareruyaRows,
  resolveCardRushPrice,
  buildCardRushSourceName,
} from "../server/normalize";

const [h, c] = await Promise.all([fetchHareruyaBuyPrices(), fetchCardRushBuyPrices()]);
const hMap = normalizeHareruyaRows(h.rows);
const cMap = normalizeCardRushRows(c.rows);
const index = buildCardRushMatchIndex(c.rows);

const oldMatched = new Set<string>();
const newMatched = new Set<string>();

for (const [name, entry] of hMap) {
  const bucket = cMap.get(cardrushLookupKey(name));
  if (bucket && resolveCardRushPrice(name, bucket) !== undefined) {
    oldMatched.add(name);
  }

  const identity = parseHareruyaIdentity(entry.rawName);
  if (identity && findCardRushMatch(identity, index)) {
    newMatched.add(name);
  }
}

const lost = [...oldMatched].filter((name) => !newMatched.has(name));
const gained = [...newMatched].filter((name) => !oldMatched.has(name));

console.log("old", oldMatched.size, "new", newMatched.size);
console.log("lost", lost.length, "gained", gained.length);
console.log("\nLost samples:");
for (const name of lost.slice(0, 15)) {
  const entry = hMap.get(name)!;
  const id = parseHareruyaIdentity(entry.rawName);
  console.log("H:", name);
  console.log("  raw:", entry.rawName);
  console.log("  id:", id);
  const bucket = cMap.get(cardrushLookupKey(name));
  if (bucket) {
    const crKey = cardrushLookupKey(name);
    console.log("  old CR key:", crKey, "price", resolveCardRushPrice(name, bucket));
  }
}

console.log("\nGained samples:");
for (const name of gained.slice(0, 10)) {
  console.log("H:", name);
}
