import json
import urllib.request

URL = (
    "https://cardrush.media/pokemon/buying_prices?"
    "displayMode=%E3%83%AA%E3%82%B9%E3%83%88&limit=5&name=&rarity=&model_number=&amount=&page=1"
    "&sort%5Bkey%5D=amount&sort%5Border%5D=desc"
    "&associations%5B%5D=ocha_product"
    "&to_json_option%5Bexcept%5D%5B%5D=original_image_source"
    "&to_json_option%5Bexcept%5D%5B%5D=created_at"
    "&to_json_option%5Binclude%5D%5Bocha_product%5D%5Bonly%5D%5B%5D=id"
    "&to_json_option%5Binclude%5D%5Bocha_product%5D%5Bmethods%5D%5B%5D=image_source"
)

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.cardrush.jp/pokemon/buying",
    "Origin": "https://www.cardrush.jp",
    "X-Requested-With": "XMLHttpRequest",
}

req = urllib.request.Request(URL, headers=headers)
with urllib.request.urlopen(req, timeout=30) as resp:
    body = resp.read()
    print("type", resp.headers.get("content-type"))
    print(body[:300])
    try:
        data = json.loads(body)
        print("keys", data.keys())
    except Exception as e:
        print("json err", e)
