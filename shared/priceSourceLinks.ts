export const HARERUYA_BUY_LIST_URL = "https://www.hareruya2.com/pages/buying-list";
export const CARD_RUSH_BUY_LIST_URL = "https://cardrush.media/pokemon/buying_prices";

export interface PriceSourceLinkInput {
  name: string;
  hareruyaTitle?: string;
  hareruyaProductId?: number | null;
  cardrushOchaProductId?: number;
}

export function extractModelNumberFromHareruyaTitle(title: string): string | null {
  const match = title.match(/〈([^〉]+)〉/);
  return match?.[1]?.trim() || null;
}

export function buildHareruyaBuyUrl(_item: PriceSourceLinkInput): string {
  return HARERUYA_BUY_LIST_URL;
}

export function buildCardRushBuyUrl(item: PriceSourceLinkInput): string {
  const url = new URL(CARD_RUSH_BUY_LIST_URL);
  const modelNumber = extractModelNumberFromHareruyaTitle(item.hareruyaTitle ?? item.name);
  if (modelNumber) {
    url.searchParams.set("model_number", modelNumber);
  } else {
    url.searchParams.set("name", item.name);
  }
  return url.toString();
}

export function buildHareruyaSellUrl(productId: number | null | undefined): string | null {
  if (!productId || productId <= 0) return null;
  return `https://www.hareruya2.com/products/${productId}`;
}

export function buildCardRushSellUrl(ochaProductId: number | null | undefined): string | null {
  if (!ochaProductId || ochaProductId <= 0) return null;
  return `https://www.cardrush-pokemon.jp/product/${ochaProductId}`;
}

export function buildTradePriceSourceLinks(item: PriceSourceLinkInput) {
  return {
    cardrushBuy: buildCardRushBuyUrl(item),
    hareruyaBuy: buildHareruyaBuyUrl(item),
    cardrushSell: buildCardRushSellUrl(item.cardrushOchaProductId),
    hareruyaSell: buildHareruyaSellUrl(item.hareruyaProductId),
  };
}
