import re
import urllib.request

for url in [
    "https://cardrush.media/pokemon",
    "https://cardrush.media/pokemon/buying_prices",
    "https://www.cardrush.jp/sell/pokemon",
    "https://www.cardrush.jp/pokemon/sell",
]:
    try:
        html = urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
            timeout=20,
        ).read().decode("utf-8", "replace")
        print("\n===", url, "len", len(html), "===")
        if "__NEXT_DATA__" in html:
            print("has __NEXT_DATA__")
        for pat in ["buying_prices", "buying", "買取", "ocha_product"]:
            if pat in html:
                print("contains", pat)
        print("title", re.search(r"<title>([^<]+)</title>", html).group(1)[:80])
    except Exception as e:
        print(url, e)
