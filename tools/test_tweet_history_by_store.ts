import assert from "node:assert/strict";
import {
  collectAccountStoreNames,
  formatTweetHistoryProfileUrl,
  normalizeTweetHistoryByStore,
  parseTweetHistoryProfileInput,
  resolveTweetHistoryScreenName,
} from "../shared/tweetHistoryAccounts";
import { createEmptyAdminSettings, normalizeAdminSettings } from "../shared/admin";
import { HARERUYA_ANNEX_SCREEN_NAME } from "../shared/tweetHistoryParse";

assert.equal(parseTweetHistoryProfileInput("https://x.com/hareruya2koriym"), "hareruya2koriym");
assert.equal(parseTweetHistoryProfileInput("https://twitter.com/hareruya2tkdbb"), "hareruya2tkdbb");
assert.equal(parseTweetHistoryProfileInput("@hareruya2annex"), "hareruya2annex");
assert.equal(parseTweetHistoryProfileInput("hareruya2annex"), "hareruya2annex");
assert.equal(parseTweetHistoryProfileInput("https://x.com/home"), null);
assert.equal(parseTweetHistoryProfileInput(""), null);

assert.equal(
  formatTweetHistoryProfileUrl("hareruya2annex"),
  "https://x.com/hareruya2annex",
);

assert.deepEqual(
  normalizeTweetHistoryByStore({
    "郡山店": "https://x.com/hareruya2koriym",
    " 高田馬場 ": "@hareruya2tkdbb",
    bad: "not a url",
    empty: "",
  }),
  {
    "郡山店": "hareruya2koriym",
    "高田馬場": "hareruya2tkdbb",
  },
);

assert.deepEqual(
  collectAccountStoreNames([
    { store: "本店" },
    { store: null },
    { store: " 本店 " },
    { store: "郡山店" },
  ]),
  ["郡山店", "本店"],
);

assert.equal(
  resolveTweetHistoryScreenName({
    username: "someone",
    store: "郡山店",
    byStore: { "郡山店": "hareruya2koriym" },
  }),
  "hareruya2koriym",
);

assert.equal(
  resolveTweetHistoryScreenName({
    username: "20260605",
    store: null,
    byStore: {},
  }),
  "hareruya2koriym",
);

assert.equal(
  resolveTweetHistoryScreenName({
    username: "unknown",
    store: "未設定店舗",
    byStore: {},
  }),
  HARERUYA_ANNEX_SCREEN_NAME,
);

const empty = createEmptyAdminSettings();
assert.deepEqual(empty.tweetHistoryByStore, {});

const normalized = normalizeAdminSettings(
  {
    globalAnnouncement: null,
    globalAnnouncementTargets: null,
    announcementsByUser: {},
    debugMemo: "memo",
    updatedAt: "2020-01-01T00:00:00.000Z",
    updatedBy: null,
  },
  [],
);
assert.deepEqual(normalized.tweetHistoryByStore, {});

const withStores = normalizeAdminSettings(
  {
    ...normalized,
    tweetHistoryByStore: { "アネックス": "https://x.com/hareruya2annex" },
  },
  [],
);
assert.deepEqual(withStores.tweetHistoryByStore, { "アネックス": "hareruya2annex" });

console.log("tweet history store settings: ok");
