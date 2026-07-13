export interface CardRushRawRow {
  name: string;
  pack: string | null;
  rarity: string | null;
  modelNumber: string | null;
  price: number;
  extraDifference: string | null;
  /** cardrush-pokemon.jp の商品ページ ID（販売価格取得用） */
  ochaProductId: number | null;
}
