import {
  isHareruyaBuyListListedSeries,
  HARERUYA_BUY_LIST_SERIES_NAMES,
} from "../shared/hareruyaBuyListPages";
import { isVisibleBuyListProduct, type HareruyaCatalogProduct } from "../server/fetch/hareruyaCatalog";

function product(overrides: Partial<HareruyaCatalogProduct>): HareruyaCatalogProduct {
  return {
    id: 1,
    title: "テスト〈001/100〉[SV1]",
    image_url: null,
    series_name: "スカーレット&バイオレットシリーズ",
    set_name: "",
    collection_number: "001/100",
    sell_price: 1000,
    buy_price: 500,
    is_pickup: false,
    ...overrides,
  };
}

if (!isHareruyaBuyListListedSeries("MEGAシリーズ")) {
  console.error("NG listed series MEGA");
  process.exit(1);
}

if (isHareruyaBuyListListedSeries("ADVシリーズ")) {
  console.error("NG ADV should not be listed");
  process.exit(1);
}

if (HARERUYA_BUY_LIST_SERIES_NAMES.length !== 6) {
  console.error("NG series count");
  process.exit(1);
}

const rayquaza = product({
  id: 2819,
  title: "レックウザex(☆){無}〈047/054〉[AD3]",
  series_name: "ADVシリーズ",
  buy_price: 180000,
  sell_price: 300000,
});

if (isVisibleBuyListProduct(rayquaza)) {
  console.error("NG Rayquaza AD3 should be filtered out");
  process.exit(1);
}

const svCard = product({
  title: "ピカチュウ〈025/165〉[SV2a]",
  series_name: "スカーレット&バイオレットシリーズ",
});

if (!isVisibleBuyListProduct(svCard)) {
  console.error("NG SV card should remain visible");
  process.exit(1);
}

console.log("OK buylist series filter");
