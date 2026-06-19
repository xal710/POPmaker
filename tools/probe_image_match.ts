import { normalizeHareruyaName } from "../server/normalize";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

async function searchIds(query: string): Promise<string[]> {
  const url = `https://www.hareruya2.com/search?${new URLSearchParams({ q: query, type: "product" })}`;
  const html = await fetch(url, {
    headers: { ...HEADERS, Accept: "text/html" },
  }).then((r) => r.text());
  return [...new Set([...html.matchAll(/\/products\/(\d{10,})/g)].map((m) => m[1]))];
}

async function fetchTitle(id: string): Promise<string> {
  const res = await fetch(`https://www.hareruya2.com/products/${id}.json`, { headers: HEADERS });
  const data = (await res.json()) as { product?: { title?: string } };
  return data.product?.title ?? "?";
}

function key(name: string): string {
  return normalizeHareruyaName(name).replace(/\s+/g, " ").trim();
}

const cases = [
  { card: "ゼルネアスEX〈038/036〉[CP5]", queries: ["038/036 CP5"] },
  { card: "メガオーダイルex (ミラー)〈169/742〉[MC]", queries: ["169/742 MC-M", "169/742 MC"] },
  { card: "ミカルゲ (ミラー)〈071/093〉[EBB]", queries: ["071/093 EBB-M", "071/093 EBB"] },
  { card: "ムク(SAR)〈117/081〉[M5]", queries: ["117/081 M5"] },
  { card: "MリザードンEX〈013/087〉[CP6]", queries: ["013/087 CP6"] },
];

async function main(): Promise<void> {
  for (const { card, queries } of cases) {
    console.log("\n===", card, "===");
    console.log("card key:", key(card));

    for (const query of queries) {
      const ids = (await searchIds(query)).slice(0, 6);
      console.log("query:", query, "ids:", ids.length);

      for (const id of ids) {
        const title = await fetchTitle(id);
        const match = key(title) === key(card);
        console.log(match ? "MATCH" : "miss", title);
        console.log("  key:", key(title));
      }
    }
  }
}

void main();
