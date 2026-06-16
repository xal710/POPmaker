import json
import re
import urllib.request

url = "https://cardrush.media/pokemon/buying_prices"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
match = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', html)
data = json.loads(match.group(1))
items = data["props"]["pageProps"]["buyingPrices"]
print("sample keys:", list(items[0].keys()))
for query in ["Mリザードン", "ゲンガー", "ミカルゲ", "バトルサーチャー"]:
    hits = [i for i in items if query in i.get("name", "")]
    print("---", query, len(hits))
    for item in hits[:4]:
        print(json.dumps(item, ensure_ascii=False))
