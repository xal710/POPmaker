import assert from "node:assert/strict";

import {
  buildPageSignature,
  canReuseSnapshot,
  type CardRushSnapshotMeta,
} from "../server/fetch/cardrushSnapshot";

function meta(overrides: Partial<CardRushSnapshotMeta> = {}): CardRushSnapshotMeta {
  return {
    updatedAt: "07/03 21:30",
    lastPage: 120,
    rowCount: 12000,
    fetchedAt: "2026-06-20T10:05:00.000Z",
    ...overrides,
  };
}

const page1Items = [
  {
    name: "ピカチュウ",
    pack_code: "SV1",
    rarity: "C",
    model_number: "001/078",
    amount: 10,
    extra_difference: null,
  },
];

assert.equal(
  buildPageSignature(page1Items),
  "001/078\tピカチュウ\t10\tSV1\t",
);

const prev = process.env.CARD_RUSH_SNAPSHOT;
process.env.CARD_RUSH_SNAPSHOT = "1";

assert.equal(
  canReuseSnapshot({ updatedAt: "07/03 21:30", lastPage: 120 }, meta()),
  true,
);

assert.equal(
  canReuseSnapshot({ updatedAt: "07/03 22:00", lastPage: 120 }, meta()),
  false,
  "updatedAt が変われば再取得",
);

assert.equal(
  canReuseSnapshot({ updatedAt: "07/03 21:30", lastPage: 121 }, meta()),
  false,
  "lastPage が変われば再取得",
);

assert.equal(
  canReuseSnapshot({ updatedAt: null, lastPage: 120 }, meta()),
  false,
  "updatedAt が無い場合はキャッシュ不可",
);

assert.equal(
  canReuseSnapshot({ updatedAt: "07/03 21:30", lastPage: 120 }, meta({ rowCount: 0 })),
  false,
  "空キャッシュは使わない",
);

process.env.CARD_RUSH_SNAPSHOT = "0";
assert.equal(
  canReuseSnapshot({ updatedAt: "07/03 21:30", lastPage: 120 }, meta()),
  false,
  "デフォルトはキャッシュ無効",
);

if (prev === undefined) {
  delete process.env.CARD_RUSH_SNAPSHOT;
} else {
  process.env.CARD_RUSH_SNAPSHOT = prev;
}

console.log("test_cardrush_snapshot: OK");
