import re
import urllib.parse
import urllib.request

BASE = "https://cardrush.media/pokemon/buying_prices"

def try_fetch(params: dict, headers: dict) -> None:
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read(400)
            print("\nURL", url[:120], "...")
            print("status", resp.status, "type", resp.headers.get("content-type"))
            print(body[:200])
    except Exception as e:
        print("error", e)

headers_list = [
    {"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
    {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://www.cardrush.jp/",
    },
    {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://www.cardrush.jp/pokemon/buying",
    },
]

params = {
    "limit": "2",
    "page": "1",
    "sort[key]": "amount",
    "sort[order]": "desc",
}

for h in headers_list:
    try_fetch(params, h)
