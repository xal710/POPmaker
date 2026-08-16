import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createEmptyAdminSettings,
  getGlobalAnnouncement,
  getGlobalAnnouncementForUser,
  getUserAnnouncement,
  hasGlobalAnnouncement,
  hasUserAnnouncement,
  isGlobalAnnouncementVisibleToUser,
  normalizeAdminSettings,
  normalizeAnnouncementTargets,
} from "../shared/admin";
import { readAdminSettings, saveAdminSettings } from "../server/adminStore";

const dataDir = mkdtempSync(join(tmpdir(), "pop-announcements-test-"));
process.env.DATA_DIR = dataDir;

const accounts = ["administrator", "Yousei710", "akito00", "h.mizuno"];

assert.deepEqual(createEmptyAdminSettings().announcementsByUser, {});
assert.equal(createEmptyAdminSettings().globalAnnouncement, null);
assert.equal(createEmptyAdminSettings().globalAnnouncementTargets, null);

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
assert.equal(migrated.globalAnnouncement, null);
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
assert.equal(migratedAll.globalAnnouncement?.text, "全員向け");
assert.equal(migratedAll.globalAnnouncement?.level, "blue");
assert.equal(migratedAll.globalAnnouncementTargets, null);
assert.equal(Object.keys(migratedAll.announcementsByUser).length, 0);

assert.deepEqual(normalizeAnnouncementTargets(["Yousei710"], accounts), ["Yousei710"]);
assert.equal(normalizeAnnouncementTargets(accounts, accounts), null);
assert.deepEqual(normalizeAnnouncementTargets([], accounts), []);

saveAdminSettings(
  {
    globalAnnouncement: "メンテナンスのお知らせ",
    globalAnnouncementTargets: null,
  },
  accounts,
  "administrator",
);
saveAdminSettings(
  {
    userAnnouncement: { username: "Yousei710", text: "馬場店向け" },
  },
  accounts,
  "administrator",
);
saveAdminSettings(
  {
    userAnnouncement: { username: "h.mizuno", text: "4F向け", level: "yellow" },
  },
  accounts,
  "administrator",
);

const settings = readAdminSettings(accounts);
assert.equal(getGlobalAnnouncement(settings)?.text, "メンテナンスのお知らせ");
assert.equal(getGlobalAnnouncement(settings)?.level, "blue");
assert.equal(isGlobalAnnouncementVisibleToUser(settings, "akito00"), true);
assert.equal(getGlobalAnnouncementForUser(settings, "akito00")?.text, "メンテナンスのお知らせ");
assert.equal(getUserAnnouncement(settings, "Yousei710")?.text, "馬場店向け");
assert.equal(getUserAnnouncement(settings, "h.mizuno")?.text, "4F向け");
assert.equal(getUserAnnouncement(settings, "h.mizuno")?.level, "yellow");
assert.equal(getUserAnnouncement(settings, "akito00"), null);
assert.equal(hasGlobalAnnouncement(settings), true);
assert.equal(hasUserAnnouncement(settings, "Yousei710"), true);
assert.equal(hasUserAnnouncement(settings, "akito00"), false);

saveAdminSettings(
  {
    globalAnnouncement: "一部向け",
    globalAnnouncementTargets: ["Yousei710", "h.mizuno"],
    globalAnnouncementLevel: "red",
  },
  accounts,
  "administrator",
);
const partial = readAdminSettings(accounts);
assert.equal(getGlobalAnnouncement(partial)?.level, "red");
assert.equal(isGlobalAnnouncementVisibleToUser(partial, "Yousei710"), true);
assert.equal(isGlobalAnnouncementVisibleToUser(partial, "akito00"), false);
assert.equal(getGlobalAnnouncementForUser(partial, "akito00"), null);

saveAdminSettings({ deleteUserAnnouncement: "Yousei710" }, accounts, "administrator");
const afterDelete = readAdminSettings(accounts);
assert.equal(getUserAnnouncement(afterDelete, "Yousei710"), null);
assert.equal(getUserAnnouncement(afterDelete, "h.mizuno")?.text, "4F向け");
assert.equal(getGlobalAnnouncement(afterDelete)?.text, "一部向け");

saveAdminSettings({ deleteGlobalAnnouncement: true }, accounts, "administrator");
const afterGlobalDelete = readAdminSettings(accounts);
assert.equal(getGlobalAnnouncement(afterGlobalDelete), null);
assert.equal(afterGlobalDelete.globalAnnouncementTargets, null);

rmSync(dataDir, { recursive: true, force: true });

console.log("test_announcements_by_user: OK");
