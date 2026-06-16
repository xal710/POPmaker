import json
import re
import urllib.parse
import urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def search_products(query: str) -> list[dict]:
    q = urllib.parse.quote(query)
    url = f"https://www.hareruya2.com/search/suggest.json?q={q}&resources[type]=product&resources[limit]=5"
    data = json.loads(fetch(url))
    products = data.get("resources", {}).get("results", {}).get("products", [])
    return products


def get_product_image(product_id: str) -> str | None:
    url = f"https://www.hareruya2.com/products/{product_id}.json"
    data = json.loads(fetch(url))
    images = data.get("product", {}).get("images", [])
    return images[0]["src"] if images else None


def main() -> None:
    test_cards = [
        "リザードン〈003/032〉[CLL]",
        "ミュウ〈030/028〉[S8a]",
        "リザードン 003/032",
        "ミュウ 030/028 S8a",
        "ムク〈117/081〉[M5]",
    ]

    for card in test_cards:
        print(f"\n--- query: {card} ---")
        try:
            products = search_products(card)
            print("hits:", len(products))
            for p in products[:3]:
                print(" ", p.get("title", "")[:80])
                print("  id:", p.get("id"))
                image = p.get("image")
                if image:
                    print("  image:", image[:100])
        except Exception as e:
            print("error:", e)

    # Predictive search alternate endpoint
    print("\n=== predictive search API ===")
    q = urllib.parse.quote("ムク 117/081 M5")
    url = f"https://www.hareruya2.com/search/suggest.json?q={q}&resources[type]=product&resources[limit]=5&resources[options][unavailable_products]=last"
    try:
        data = json.loads(fetch(url))
        print(json.dumps(data, ensure_ascii=False)[:800])
    except Exception as e:
        print("error:", e)


if __name__ == "__main__":
    main()
