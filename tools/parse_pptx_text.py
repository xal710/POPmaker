import re
import zipfile
from pathlib import Path

pptx = Path(__file__).resolve().parents[1] / "public/pop-template/template.pptx"
with zipfile.ZipFile(pptx) as z:
    xml = z.read("ppt/slides/slide2.xml").decode("utf-8")

for tag in ("p:sp", "p:pic"):
    for i, part in enumerate(re.split(rf"<{tag}", xml)[1:], 1):
        chunk = part.split(f"</{tag}>")[0]
        texts = re.findall(r"<a:t>([^<]*)</a:t>", chunk)
        if not texts:
            continue
        xfrm = re.search(
            r"<a:xfrm>.*?<a:off x=\"(-?\d+)\" y=\"(-?\d+)\".*?<a:ext cx=\"(\d+)\" cy=\"(\d+)\"",
            chunk,
            re.S,
        )
        sz = re.search(r"<a:sz val=\"(\d+)\"", chunk)
        color = re.search(r"<a:srgbClr val=\"([A-Fa-f0-9]+)\"", chunk)
        print(f"=== {tag} {i} ===")
        print("text:", "".join(texts))
        if xfrm:
            print("rect:", xfrm.group(1), xfrm.group(2), xfrm.group(3), xfrm.group(4))
        print("sz:", sz.group(1) if sz else None)
        print("color:", color.group(1) if color else None)
