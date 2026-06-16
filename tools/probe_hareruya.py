import json
import re
import urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_images(html: str) -> list[str]:
    return sorted(
        set(
            re.findall(
                r"https?://[^\s\"'>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\"'>]*)?",
                html,
                re.I,
            )
        )
    )


def main() -> None:
    pages = {
        "buy_mega": "https://www.hareruya2.com/pages/buying-list-mega",
        "home": "https://www.hareruya2.com/",
        "search": "https://www.hareruya2.com/search?q=リザードン+003/032&type=product",
    }

    for name, url in pages.items():
        print(f"\n=== {name} ===")
        html = fetch(url)
        print("html_len", len(html))
        imgs = extract_images(html)
        print("image_count", len(imgs))
        for img in imgs[:8]:
            print(" ", img[:160])

        links = re.findall(r'href="(/products/[^"]+)"', html)
        print("product_links", len(links))
        for link in links[:3]:
            print(" ", link)

        # Shopify JSON in script tags
        json_blocks = re.findall(
            r'<script[^>]*type="application/json"[^>]*>(.*?)</script>',
            html,
            re.S,
        )
        print("json_blocks", len(json_blocks))
        for block in json_blocks[:2]:
            try:
                data = json.loads(block)
                print(" json_keys", list(data.keys())[:10] if isinstance(data, dict) else type(data))
            except json.JSONDecodeError:
                pass

    # Probe a product page if found
    html = fetch(pages["home"])
    product_links = re.findall(r'href="(/products/[^"]+)"', html)
    if product_links:
        product_url = "https://www.hareruya2.com" + product_links[0]
        print(f"\n=== product: {product_url} ===")
        product_html = fetch(product_url)
        imgs = extract_images(product_html)
        print("image_count", len(imgs))
        for img in imgs[:10]:
            print(" ", img[:180])

        og = re.search(r'property="og:image" content="([^"]+)"', product_html)
        if og:
            print("og:image", og.group(1))


if __name__ == "__main__":
    main()
