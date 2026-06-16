import json
import re
import urllib.request

BASE = "https://cardrush.media/pokemon/buying_prices"


def fetch_page(page: int = 1) -> dict:
    url = BASE if page == 1 else f"{BASE}?page={page}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', html)
    return json.loads(match.group(1))["props"]["pageProps"]


first = fetch_page(1)
last_page = first["lastPage"]
targets = []

for page in range(1, last_page + 1):
    data = first if page == 1 else fetch_page(page)
    for item in data["buyingPrices"]:
        name = item.get("name", "")
        if any(
            key in name or (item.get("pack_code") == code and key in name)
            for key, code in [
                ("Mリザードン", "CP6"),
                ("ゲンガー", "20th"),
                ("ミカルゲ", "EBB"),
                ("バトルサーチャー", "XY6"),
            ]
        ):
            targets.append(item)
        if item.get("pack_code") in {"CP6", "20th", "EBB", "XY6"} and (
            "Mリザードン" in name or "ゲンガー" in name or "ミカルゲ" in name or "バトルサーチャー" in name
        ):
            targets.append(item)

seen = set()
for item in targets:
    key = item["id"]
    if key in seen:
        continue
    seen.add(key)
    print(json.dumps(item, ensure_ascii=False))

print("found", len(seen))
