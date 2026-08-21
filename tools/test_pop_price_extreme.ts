import assert from "node:assert/strict";
import {
  getPopPriceChangeRatio,
  getWallSlotIndicatorClassNames,
  hasPopPriceExtremeChange,
  hasPopPriceMismatch,
} from "../src/utils/popPlacementIndicators";
import type { StoredWallSlotPop } from "../shared/popPlacement";

assert.equal(hasPopPriceMismatch(1000, 1100), true);
assert.equal(hasPopPriceMismatch(1000, 1000), false);
assert.equal(hasPopPriceExtremeChange(1000, 1500), true);
assert.equal(hasPopPriceExtremeChange(1000, 700), true);
assert.equal(hasPopPriceExtremeChange(1000, 1499), false);
assert.equal(hasPopPriceExtremeChange(1000, 701), false);
assert.equal(hasPopPriceExtremeChange(1000, 1000), false);
assert.equal(getPopPriceChangeRatio(1000, 1500), 1.5);
assert.equal(getPopPriceChangeRatio(0, 100), null);

const base: StoredWallSlotPop = {
  cardName: "テスト",
  sourceName: "テスト",
  priceYen: 1000,
  cardImageUrl: null,
  placedAt: "2026-01-01",
  placedPriceYen: 1000,
};

assert.ok(getWallSlotIndicatorClassNames(base, 1200).includes("price-mismatch"));
assert.ok(!getWallSlotIndicatorClassNames(base, 1200).includes("price-extreme"));
assert.ok(getWallSlotIndicatorClassNames(base, 1500).includes("price-extreme"));
assert.ok(!getWallSlotIndicatorClassNames(base, 1500).includes("price-mismatch"));
assert.ok(getWallSlotIndicatorClassNames(base, 700).includes("price-extreme"));

console.log("pop price extreme highlight: ok");
