import { isOfficialBuyListVisible } from "../shared/hareruyaBuyListFilter";
import type { ComparisonItem } from "../src/types";
import { applyOfficialBuyListFilter, passesOfficialBuyListFilter } from "../src/utils/officialBuyListFilter";

function item(partial: Partial<ComparisonItem> & Pick<ComparisonItem, "id" | "name" | "hareruya2">): ComparisonItem {
  return {
    cardrush: 100,
    diff: 0,
    matched: true,
    ...partial,
  };
}

const officialVisible = item({
  id: 1,
  name: "ムク〈117/081〉[M5]",
  hareruya2: 100,
  hareruyaSellPrice: 1000,
  hareruyaSeriesName: "MEGAシリーズ",
  officialBuyListVisible: true,
});

const highValue = item({
  id: 2,
  name: "高額カード",
  hareruya2: 50000,
  hareruyaSellPrice: 600000,
  hareruyaSeriesName: "MEGAシリーズ",
  officialBuyListVisible: false,
});

const lowBuy = item({
  id: 3,
  name: "低額買取",
  hareruya2: 10,
  hareruyaSellPrice: 100,
  hareruyaSeriesName: "MEGAシリーズ",
  officialBuyListVisible: false,
});

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("NG", message);
    process.exit(1);
  }
}

assert(isOfficialBuyListVisible({ buyPrice: 100, sellPrice: 499999, seriesName: "MEGAシリーズ" }), "visible");
assert(!isOfficialBuyListVisible({ buyPrice: 100, sellPrice: 500000, seriesName: "MEGAシリーズ" }), "high sell");
assert(!isOfficialBuyListVisible({ buyPrice: 49, sellPrice: 100, seriesName: "MEGAシリーズ" }), "low buy");
assert(
  !isOfficialBuyListVisible({ buyPrice: 100, sellPrice: 100, seriesName: "その他シリーズ" }),
  "invalid series",
);

assert(passesOfficialBuyListFilter(officialVisible), "official item passes");
assert(!passesOfficialBuyListFilter(highValue), "high value hidden");
assert(applyOfficialBuyListFilter([officialVisible, highValue, lowBuy], false).length === 1, "default filter");
assert(applyOfficialBuyListFilter([officialVisible, highValue, lowBuy], true).length === 3, "include all");

console.log("OK official buy list filter");
