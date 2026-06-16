import json
import re
import urllib.parse
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ja,en;q=0.9",
    "Expect": "",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def main() -> None:
    tests = [
        "https://www.hareruya2.com/search/suggest.json?q=117%2F081&resources[type]=product&resources[limit]=3",
        "https://www.hareruya2.com/search/suggest.json?q=%E3%83%A0%E3%82%AF&resources[type]=product&resources[limit]=3",
    ]
    for url in tests:
        print("\nAPI:", url)
        try:
            body = fetch(url)
            print(body[:500])
        except Exception as e:
            print("error:", e)

    queries = [
        "117/081 M5",
        "003/032 CLL",
        "ムク 117/081",
    ]
    for q in queries:
        url = "https://www.hareruya2.com/search?" + urllib.parse.urlencode(
            {"q": q, "type": "product"}
        )
        print("\nHTML search:", q)
        html = fetch(url).decode("utf-8", errors="replace")
        ids = re.findall(r"/products/(\d{10,})", html)
        print("product ids:", ids[:5])
        imgs = sorted(set(re.findall(r"https://cdn\.shopify\.com/s/files/[^\s\"'>]+", html)))
        print("images:", len(imgs))
        for img in imgs[:3]:
            print(" ", img[:140])

        # product titles in search results
        for m in re.finditer(r'"title":"([^"]{5,120})"', html):
            title = m.group(1)
            if "ムク" in title or "117" in title or "003" in title or "リザードン" in title:
                print(" title:", title[:100])


if __name__ == "__main__":
    main()
