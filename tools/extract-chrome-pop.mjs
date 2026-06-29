import { ClassicLevel } from "classic-level";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourceDir = join(
  process.env.LOCALAPPDATA ?? "",
  "Google/Chrome/User Data/Default/Local Storage/leveldb",
);

const tempDir = mkdtempSync(join(tmpdir(), "pop-chrome-"));
cpSync(sourceDir, tempDir, { recursive: true });

const db = new ClassicLevel(tempDir, {
  createIfMissing: false,
  keyEncoding: "buffer",
  valueEncoding: "buffer",
});

function countAssignments(store) {
  let count = 0;
  for (const wall of Object.values(store)) {
    if (wall && typeof wall === "object") count += Object.keys(wall).length;
  }
  return count;
}

function decodeValue(value) {
  if (value.length >= 3 && value[0] === 0x00 && value[1] === 0x7b) {
    return value.subarray(1).toString("utf16le");
  }
  if (value.length >= 2 && value[0] === 0x00) {
    return value.subarray(1).toString("utf16le");
  }
  if (value.length >= 1 && value[0] === 0x01) {
    return value.subarray(1).toString("utf8");
  }
  return value.toString("utf8");
}

const preferredKeys = [
  "pop-placement-assignments-v2",
  "pop-placement-assignments",
];

let best = null;
let bestCount = 0;
let bestKey = "";

for await (const [key, value] of db.iterator()) {
  const keyText = key.toString("utf8");
  const matched = preferredKeys.find((needle) => keyText.endsWith(`\0${needle}`) || keyText.endsWith(needle));
  if (!matched) continue;

  const raw = decodeValue(value).trim();
  try {
    const parsed = JSON.parse(raw);
    const count = countAssignments(parsed);
    console.log(`${matched}: ${count} 件`);
    if (count > bestCount) {
      best = parsed;
      bestCount = count;
      bestKey = matched;
    }
  } catch (error) {
    console.error(`${matched}: parse error`, error.message);
    console.error(raw.slice(0, 120));
  }
}

await db.close();
rmSync(tempDir, { recursive: true, force: true });

if (!best || bestCount === 0) {
  console.error("配置データが見つかりませんでした");
  process.exit(1);
}

writeFileSync("tools/pop-placement-export.json", JSON.stringify(best, null, 2));
console.log(`保存: tools/pop-placement-export.json (${bestKey}, ${bestCount} 件)`);
