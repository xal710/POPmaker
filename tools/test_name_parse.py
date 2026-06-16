import re

SAMPLES = [
    "リザードン〈003/032〉[CLL]",
    "ミュウ〈030/028〉[S8a]",
    "ミュウex〈347/190〉[SV4a]",
    "メガダークライex〈114/081〉[M5]",
    "ブラッキー☆ (未開封)〈026/PLAY〉",
    "モンスターボール〈002/015〉[S8a-G]",
]

pattern = re.compile(r"〈([^〉]+)〉\[([^\]]+)\]")


def to_search_query(name: str) -> str | None:
    m = pattern.search(name)
    if not m:
        return None
    number, pack = m.groups()
    return f"{number} {pack}"


for name in SAMPLES:
    print(name, "->", to_search_query(name))
