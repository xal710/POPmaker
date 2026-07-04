import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createEmptyAdminSettings,
  getUserAnnouncement,
  hasUserAnnouncement,
  normalizeAdminSettings,
} from "../shared/admin";
import { readAdminSettings, saveAdminSettings } from "../server/adminStore";

const dataDir = mkdtempSync(join(tmpdir(), "pop-announcements-test-"));
process.env.DATA_DIR = dataDir;

const accounts = ["administrator", "Yousei710", "akito00", "h.mizuno"];

assert.deepEqual(createEmptyAdminSettings().announcementsByUser, {});

const migrated = normalizeAdminSettings(
  {
    announcement: "共通のお知らせ",
    announcementTargets: ["Yousei710", "h.mizuno"],
    debugMemo: "memo",
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "administrator",
  },
  accounts,
);

assert.equal(migrated.announcementsByUser.Yousei710?.text, "共通のお知らせ");
assert.equal(migrated.announcementsByUser["h.mizuno"]?.text, "共通のお知らせ");
assert.equal(migrated.announcementsByUser.akito00, undefined);
assert.equal(migrated.debugMemo, "memo");

const migratedAll = normalizeAdminSettings(
  {
    announcement: "全員向け",
    announcementTargets: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
    updatedBy: null,
  },
  accounts,
);
assert.equal(Object.keys(migratedAll.announcementsByUser).length, accounts.length);

saveAdminSettings(
  {
    userAnnouncement: { username: "Yousei710", text: "馬場店向け" },
  },
  accounts,
  "administrator",
);
saveAdminSettings(
  {
    userAnnouncement: { username: "h.mizuno", text: "4F向け" },
  },
  accounts,
  "administrator",
);

const settings = readAdminSettings(accounts);
assert.equal(getUserAnnouncement(settings, "Yousei710")?.text, "馬場店向け");
assert.equal(getUserAnnouncement(settings, "h.mizuno")?.text, "4F向け");
assert.equal(getUserAnnouncement(settings, "akito00"), null);
assert.equal(hasUserAnnouncement(settings, "Yousei710"), true);
assert.equal(hasUserAnnouncement(settings, "akito00"), false);

saveAdminSettings({ deleteUserAnnouncement: "Yousei710" }, accounts, "administrator");
const afterDelete = readAdminSettings(accounts);
assert.equal(getUserAnnouncement(afterDelete, "Yousei710"), null);
assert.equal(getUserAnnouncement(afterDelete, "h.mizuno")?.text, "4F向け");

rmSync(dataDir, { recursive: true, force: true });

console.log("test_announcements_by_user: OK");
