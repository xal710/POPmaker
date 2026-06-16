import json
import urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0", "Expect": ""}

IDS = [
    "10135644897600",
    "9017496731968",
    "9062645694784",
]


def main() -> None:
    for pid in IDS:
        url = f"https://www.hareruya2.com/products/{pid}.json"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
        p = data["product"]
        print("\nID:", pid)
        print("title:", p["title"])
        if p.get("images"):
            print("image:", p["images"][0]["src"][:160])


if __name__ == "__main__":
    main()
