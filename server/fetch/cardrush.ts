import { fetchText, sleep } from "./http";

export interface CardRushRawRow {
  name: string;
  pack: string | null;
  rarity: string | null;
  modelNumber: string | null;
  price: number;
  extraDifference: string | null;
}

interface NextBuyingPage {
  buyingPrices: Array<{
    name: string;
    pack_code: string | null;
    rarity: string | null;
    model_number: string | null;
    amount: number;
    extra_difference: string | null;
  }>;
  lastPage: number;
  updatedAt?: string;
}

const BASE_URL = "https://cardrush.media/pokemon/buying_prices";

function extractNextData(html: string): NextBuyingPage {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("カードラッシュのデータを読み取れませんでした");
  }

  const data = JSON.parse(match[1]) as {
    props: { pageProps: NextBuyingPage };
  };

  return data.props.pageProps;
}

export async function fetchCardRushBuyPrices(
  onProgress?: (message: string) => void,
): Promise<{ rows: CardRushRawRow[]; updatedAt: string | null }> {
  const firstHtml = await fetchText(BASE_URL);
  const firstPage = extractNextData(firstHtml);
  const lastPage = firstPage.lastPage;
  const updatedAt = firstPage.updatedAt ?? null;

  const rows: CardRushRawRow[] = [];

  const appendPage = (pageData: NextBuyingPage) => {
    for (const item of pageData.buyingPrices) {
      rows.push({
        name: item.name,
        pack: item.pack_code,
        rarity: item.rarity,
        modelNumber: item.model_number,
        price: item.amount,
        extraDifference: item.extra_difference,
      });
    }
  };

  appendPage(firstPage);

  for (let page = 2; page <= lastPage; page += 1) {
    onProgress?.(`カードラッシュ: ${page}/${lastPage} ページを取得中...`);
    const html = await fetchText(`${BASE_URL}?page=${page}`);
    appendPage(extractNextData(html));
    if (page % 5 === 0) {
      await sleep(150);
    }
  }

  return { rows, updatedAt };
}
