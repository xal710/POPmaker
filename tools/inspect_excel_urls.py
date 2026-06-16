import re
import zipfile
from pathlib import Path

path = Path(r"c:\Users\youse\Downloads\買取価格比較\買取価格比較_ver1.2.xlsm")
with zipfile.ZipFile(path) as z:
    for name in ["xl/connections.xml", "xl/queryTables/queryTable1.xml"]:
        if name in z.namelist():
            data = z.read(name).decode("utf-8", "replace")
            print(f"=== {name} ===")
            for url in sorted(set(re.findall(r"https?://[^<>\"'\s]+", data))):
                print(url)
