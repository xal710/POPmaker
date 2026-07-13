import assert from "node:assert/strict";

import { parseCardRushSellPriceFromHtml } from "../server/fetch/cardrushSell";

const sampleHtml = `
<p class="selling_price">
  <span class="price_label" id="price_label">販売価格</span>
  <span class="figure" id="pricech">94,800円</span>
</p>
`;

assert.equal(parseCardRushSellPriceFromHtml(sampleHtml), 94800);
assert.equal(parseCardRushSellPriceFromHtml("<html></html>"), null);

console.log("OK cardrush sell parser");
