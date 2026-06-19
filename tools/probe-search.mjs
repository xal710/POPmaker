const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function probe(label, url) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  const ids = [...text.matchAll(/\/products\/(\d{10,})/g)].map((m) => m[1]);
  console.log(label, response.status, "ids", [...new Set(ids)]);
  return response.status;
}

await probe(
  "search",
  "https://www.hareruya2.com/search?q=038%2F036+CP5&type=product",
);
await probe("buylist", "https://www.hareruya2.com/pages/buying-list-xy");
await probe("product.json", "https://www.hareruya2.com/products/9015518036288.json");
