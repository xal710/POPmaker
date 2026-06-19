import { parseBuyListUpdatedAt } from "../server/fetch/hareruya";
import { formatBuyListDateMmDd } from "../shared/hareruyaBuyListPages";

const sample =
  "※在庫状況やカードの状態により価格が変動することがあります更新日時: 2026/06/17 10:16 カード名で絞り込む";

const parsed = parseBuyListUpdatedAt(sample);
if (parsed !== "2026-06-17") {
  console.error("NG parse", parsed);
  process.exit(1);
}

if (formatBuyListDateMmDd(parsed) !== "06/17") {
  console.error("NG format", formatBuyListDateMmDd(parsed));
  process.exit(1);
}

console.log("OK buylist dates");
