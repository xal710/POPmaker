import { getBuyListDisplayDate, parseBuyListUpdatedAt, parseHttpDateToJstDateString } from "../server/fetch/hareruyaCatalog";
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

const today = getBuyListDisplayDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error("NG today format", today);
  process.exit(1);
}

const fromHttp = parseHttpDateToJstDateString("Wed, 01 Jul 2026 09:00:08 GMT");
if (fromHttp !== "2026-07-01") {
  console.error("NG http date", fromHttp);
  process.exit(1);
}

console.log("OK buylist dates");
