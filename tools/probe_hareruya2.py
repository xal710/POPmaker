import json
import re
import urllib.parse
import urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> None:
    product_id = "9667471212864"
    product_url = f"https://www.hareruya2.com/products/{product_id}"
    print("=== product page ===")
    html = fetch(product_url)
    print("title snippet:", re.search(r"<title>([^<]+)</title>", html).group(1)[:120])

    og = re.search(r'property="og:image" content="([^"]+)"', html)
    if og:
        print("og:image:", og.group(1))

    imgs = sorted(
        set(
            re.findall(
                r"https?://[^\s\"'>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\"'>]*)?",
                html,
                re.I,
            )
        )
    )
    print("images:", len(imgs))
    for img in imgs[:12]:
        print(" ", img[:180])

  # Shopify product JSON endpoint
    json_url = f"https://www.hareruya2.com/products/{product_id}.json"
    print("\n=== product.json ===")
    data = json.loads(fetch(json_url))
    product = data["product"]
    print("title:", product["title"][:100])
    for image in product.get("images", [])[:3]:
        print(" image:", image.get("src", "")[:180])

    # Buy list: check if card names link anywhere / lazy loaded data
    buy_url = "https://www.hareruya2.com/pages/buying-list-mega"
    print("\n=== buy list structure ===")
    buy_html = fetch(buy_url)
    # look for card image patterns in custom data paths
    custom_imgs = re.findall(r"/data/hareruya2/image/[^\s\"'>]+", buy_html)
    print("custom /data paths:", len(set(custom_imgs)))
    for p in sorted(set(custom_imgs))[:10]:
        print(" ", p)

    # check if buy list has product handles or IDs embedded
    ids = re.findall(r"/products/(\d+)", buy_html)
    print("embedded product ids:", len(set(ids)))

    # Search API via encoded query
    q = urllib.parse.quote("リザードン 003/032")
    search_url = f"https://www.hareruya2.com/search?q={q}&type=product"
    print("\n=== search ===")
    search_html = fetch(search_url)
    search_imgs = re.findall(r"cdn\.shopify\.com/s/files/[^\s\"'>]+", search_html)
    print("shopify imgs:", len(set(search_imgs)))
    for img in sorted(set(search_imgs))[:5]:
        print(" ", "https://" + img[:160])
    search_links = re.findall(r"/products/(\d+)", search_html)
    print("product ids:", search_links[:5])

    # Test direct image hotlink headers
    if og:
        img_url = og.group(1)
        print("\n=== image response headers ===")
        req = urllib.request.Request(img_url, headers=HEADERS, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                for k in ["access-control-allow-origin", "content-type", "cache-control"]:
                    print(f" {k}: {resp.headers.get(k)}")
        except Exception as e:
            print(" head error:", e)


if __name__ == "__main__":
    main()
