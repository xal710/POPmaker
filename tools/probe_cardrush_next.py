import json
import re
import urllib.request

url = "https://cardrush.media/pokemon/buying_prices"
html = urllib.request.urlopen(
    urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
    timeout=30,
).read().decode("utf-8", "replace")

m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
data = json.loads(m.group(1))
print("top keys", data.keys())
props = data["props"]["pageProps"]
print("pageProps keys", props.keys())

for key in props:
    val = props[key]
    if isinstance(val, list):
        print(key, "list", len(val))
        if val:
            print(" sample keys", val[0].keys() if isinstance(val[0], dict) else type(val[0]))
    elif isinstance(val, dict):
        print(key, "dict", list(val.keys())[:15])

# dig for buying_prices
text = json.dumps(props, ensure_ascii=False)
print("buying_prices in props", "buying_prices" in text)

def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("buying_prices", "buyingPrices", "items", "data"):
                print("FOUND", path + "." + k, type(v), len(v) if isinstance(v, list) else "")
            walk(v, path + "." + k)
    elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
        if "amount" in obj[0] or "buying_price" in obj[0]:
            print("LIST at", path, "keys", obj[0].keys())
            print("sample", {k: obj[0].get(k) for k in list(obj[0])[:12]})

walk(props)
