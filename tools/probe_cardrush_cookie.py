import http.cookiejar
import json
import re
import urllib.request

URL = (
    "https://cardrush.media/pokemon/buying_prices?"
    "displayMode=%E3%83%AA%E3%82%B9%E3%83%88&limit=3&page=1"
    "&sort%5Bkey%5D=amount&sort%5Border%5D=desc"
    "&associations%5B%5D=ocha_product"
    "&to_json_option%5Bexcept%5D%5B%5D=original_image_source"
    "&to_json_option%5Bexcept%5D%5B%5D=created_at"
    "&to_json_option%5Binclude%5D%5Bocha_product%5D%5Bonly%5D%5B%5D=id"
    "&to_json_option%5Binclude%5D%5Bocha_product%5D%5Bmethods%5D%5B%5D=image_source"
    "&display_category%5B%5D=%E6%9C%80%E6%96%B0%E5%BC%BE"
    "&display_category%5B%5D=%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%80%E3%83%BC%E3%83%89"
    "&display_category%5B%5D=%E3%82%A8%E3%82%AF%E3%82%B9%E3%83%88%E3%83%A9"
    "&display_category%5B%5D=%E6%97%A7%E8%A3%8F"
)

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [
    ("User-Agent", "Mozilla/5.0"),
    ("Accept", "application/json, text/plain, */*"),
    ("Referer", "https://cardrush.media/pokemon"),
]

for warm in ["https://cardrush.media/", "https://cardrush.media/pokemon"]:
    opener.open(warm, timeout=20).read()[:100]

resp = opener.open(URL, timeout=30)
body = resp.read()
print("type", resp.headers.get("content-type"))
print(body[:250])
try:
    data = json.loads(body)
    print("json keys", data.keys())
    for k, v in data.items():
        if isinstance(v, list):
            print(k, "len", len(v), "sample", v[0] if v else None)
except Exception as e:
    print("json error", e)
