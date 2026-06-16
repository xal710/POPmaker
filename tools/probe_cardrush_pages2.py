import json
import re
import urllib.request

for page in [1, 2, 120]:
    url = f"https://cardrush.media/pokemon/buying_prices?page={page}"
    html = urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
        timeout=30,
    ).read().decode()
    data = json.loads(
        re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1)
    )
    pp = data["props"]["pageProps"]
    print(
        "page",
        page,
        "items",
        len(pp["buyingPrices"]),
        "lastPage",
        pp["lastPage"],
        "updatedAt",
        pp.get("updatedAt"),
    )
