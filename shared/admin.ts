export const ADMIN_USERNAME = "administrator";

export function isAdministrator(username: string | null | undefined): boolean {
  return username === ADMIN_USERNAME;
}

export const ANNOUNCEMENT_LEVELS = ["blue", "yellow", "red"] as const;
export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];
export const DEFAULT_ANNOUNCEMENT_LEVEL: AnnouncementLevel = "blue";

export const ANNOUNCEMENT_LEVEL_OPTIONS: Array<{
  value: AnnouncementLevel;
  label: string;
}> = [
  { value: "blue", label: "青（通常）" },
  { value: "yellow", label: "黄（注意）" },
  { value: "red", label: "赤（重要）" },
];

export function isAnnouncementLevel(value: unknown): value is AnnouncementLevel {
  return value === "blue" || value === "yellow" || value === "red";
}

export function normalizeAnnouncementLevel(value: unknown): AnnouncementLevel {
  return isAnnouncementLevel(value) ? value : DEFAULT_ANNOUNCEMENT_LEVEL;
}

export interface AccountAnnouncement {
  text: string;
  updatedAt: string;
  updatedBy: string | null;
  level: AnnouncementLevel;
}

export interface AdminSettings {
  globalAnnouncement: AccountAnnouncement | null;
  /** null のときは全アカウント向け */
  globalAnnouncementTargets: string[] | null;
  announcementsByUser: Record<string, AccountAnnouncement>;
  /** 所属店舗名 → X スクリーンネーム */
  tweetHistoryByStore: Record<string, string>;
  debugMemo: string;
  updatedAt: string;
  updatedBy: string | null;
}

import type { TweetTemplateMode } from "./accountProfile";
import type { AccountApplication } from "./accountRegistration";
import { normalizeTweetHistoryByStore } from "./tweetHistoryAccounts";

export interface AdminAccountSummary {
  username: string;
  displayName?: string;
  store?: string | null;
  isAdministrator: boolean;
  canUsePopPlacementOnline: boolean;
  canUseTradeFeatures: boolean;
  suspended: boolean;
  tweetTemplateMode: TweetTemplateMode;
  tweetTemplateCustom: string | null;
}

export interface AdminSettingsResponse {
  accounts: AdminAccountSummary[];
  settings?: AdminSettings;
  applications?: AccountApplication[];
}

export interface AdminAnnouncementResponse {
  globalAnnouncement: string;
  globalUpdatedAt: string | null;
  globalAnnouncementLevel: AnnouncementLevel;
  userAnnouncement: string;
  userUpdatedAt: string | null;
  userAnnouncementLevel: AnnouncementLevel;
}

export function getGlobalAnnouncement(settings: AdminSettings): AccountAnnouncement | null {
  const text = settings.globalAnnouncement?.text?.trim();
  if (!text) return null;
  return settings.globalAnnouncement;
}

export function isGlobalAnnouncementVisibleToUser(
  settings: AdminSettings,
  username: string,
): boolean {
  if (!getGlobalAnnouncement(settings)) return false;

  const targets = settings.globalAnnouncementTargets;
  if (targets === null || targets === undefined) return true;

  return targets.includes(username);
}

export function getGlobalAnnouncementForUser(
  settings: AdminSettings,
  username: string,
): AccountAnnouncement | null {
  if (!isGlobalAnnouncementVisibleToUser(settings, username)) return null;
  return getGlobalAnnouncement(settings);
}

export function hasGlobalAnnouncement(settings: AdminSettings): boolean {
  return getGlobalAnnouncement(settings) !== null;
}

export function normalizeAnnouncementTargets(
  selected: string[],
  allUsernames: string[],
): string[] | null {
  const unique = [...new Set(selected.filter((name) => allUsernames.includes(name)))];
  if (unique.length === 0) return [];
  if (unique.length === allUsernames.length) return null;
  return unique.sort();
}

export function resolveAnnouncementTargetSelection(
  targets: string[] | null | undefined,
  allUsernames: string[],
): Set<string> {
  if (targets === null || targets === undefined) {
    return new Set(allUsernames);
  }
  return new Set(targets.filter((name) => allUsernames.includes(name)));
}

export function countGlobalAnnouncementTargets(
  settings: AdminSettings,
  allUsernames: string[],
): number {
  if (!hasGlobalAnnouncement(settings)) return 0;
  const targets = settings.globalAnnouncementTargets;
  if (targets === null || targets === undefined) return allUsernames.length;
  return targets.filter((username) => allUsernames.includes(username)).length;
}

export function getUserAnnouncement(
  settings: AdminSettings,
  username: string,
): AccountAnnouncement | null {
  const entry = settings.announcementsByUser[username];
  if (!entry?.text?.trim()) return null;
  return entry;
}

export function hasUserAnnouncement(settings: AdminSettings, username: string): boolean {
  return getUserAnnouncement(settings, username) !== null;
}

export function countActiveUserAnnouncements(settings: AdminSettings): number {
  return Object.keys(settings.announcementsByUser).filter((username) =>
    Boolean(settings.announcementsByUser[username]?.text?.trim()),
  ).length;
}

interface LegacyAdminSettings {
  announcement?: string;
  announcementTargets?: string[] | null;
  debugMemo?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

function isAccountAnnouncement(value: unknown): value is AccountAnnouncement {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.text === "string" &&
    typeof record.updatedAt === "string" &&
    (record.updatedBy === null || typeof record.updatedBy === "string") &&
    (record.level === undefined || isAnnouncementLevel(record.level))
  );
}

function normalizeAccountAnnouncement(value: AccountAnnouncement): AccountAnnouncement {
  return {
    text: value.text,
    updatedAt: value.updatedAt,
    updatedBy: value.updatedBy,
    level: normalizeAnnouncementLevel(value.level),
  };
}

function normalizeAnnouncementsByUser(
  value: Record<string, AccountAnnouncement>,
): Record<string, AccountAnnouncement> {
  const next: Record<string, AccountAnnouncement> = {};
  for (const [username, entry] of Object.entries(value)) {
    next[username] = normalizeAccountAnnouncement(entry);
  }
  return next;
}

function isAnnouncementsByUser(value: unknown): value is Record<string, AccountAnnouncement> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => isAccountAnnouncement(entry));
}

function normalizeGlobalAnnouncement(value: unknown): AccountAnnouncement | null {
  if (value === null || value === undefined) return null;
  if (!isAccountAnnouncement(value)) return null;
  return value.text.trim() ? normalizeAccountAnnouncement(value) : null;
}

function isValidAnnouncementTargets(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => typeof entry === "string");
}

function normalizeGlobalAnnouncementTargets(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function isAdminSettings(value: unknown): value is AdminSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const tweetHistoryOk =
    record.tweetHistoryByStore === undefined ||
    (record.tweetHistoryByStore !== null &&
      typeof record.tweetHistoryByStore === "object" &&
      !Array.isArray(record.tweetHistoryByStore) &&
      Object.values(record.tweetHistoryByStore as Record<string, unknown>).every(
        (entry) => typeof entry === "string",
      ));

  return (
    isAnnouncementsByUser(record.announcementsByUser) &&
    (record.globalAnnouncement === null ||
      record.globalAnnouncement === undefined ||
      isAccountAnnouncement(record.globalAnnouncement)) &&
    isValidAnnouncementTargets(record.globalAnnouncementTargets) &&
    tweetHistoryOk &&
    typeof record.debugMemo === "string" &&
    typeof record.updatedAt === "string" &&
    (record.updatedBy === null || typeof record.updatedBy === "string")
  );
}

function promoteDuplicateGlobalAnnouncements(
  settings: AdminSettings,
  accountUsernames: string[],
): AdminSettings {
  if (hasGlobalAnnouncement(settings) || accountUsernames.length === 0) {
    return settings;
  }

  const activeEntries = accountUsernames
    .map((username) => settings.announcementsByUser[username])
    .filter((entry): entry is AccountAnnouncement => Boolean(entry?.text?.trim()));

  if (activeEntries.length !== accountUsernames.length) {
    return settings;
  }

  const firstText = activeEntries[0].text.trim();
  if (!activeEntries.every((entry) => entry.text.trim() === firstText)) {
    return settings;
  }

  return {
    ...settings,
    globalAnnouncement: {
      text: firstText,
      updatedAt: activeEntries[0].updatedAt,
      updatedBy: activeEntries[0].updatedBy,
      level: normalizeAnnouncementLevel(activeEntries[0].level),
    },
    globalAnnouncementTargets: null,
    announcementsByUser: {},
  };
}

export function normalizeAdminSettings(
  raw: unknown,
  accountUsernames: string[],
): AdminSettings {
  if (isAdminSettings(raw)) {
    const record = raw as AdminSettings;
    const normalized: AdminSettings = {
      globalAnnouncement: normalizeGlobalAnnouncement(record.globalAnnouncement),
      globalAnnouncementTargets: normalizeGlobalAnnouncementTargets(record.globalAnnouncementTargets),
      announcementsByUser: normalizeAnnouncementsByUser(record.announcementsByUser),
      tweetHistoryByStore: normalizeTweetHistoryByStore(
        (raw as unknown as Record<string, unknown>).tweetHistoryByStore ??
          record.tweetHistoryByStore,
      ),
      debugMemo: record.debugMemo,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    };
    return promoteDuplicateGlobalAnnouncements(normalized, accountUsernames);
  }

  if (!raw || typeof raw !== "object") {
    return createEmptyAdminSettings();
  }

  const legacy = raw as LegacyAdminSettings;
  const announcementsByUser: Record<string, AccountAnnouncement> = {};
  let globalAnnouncement: AccountAnnouncement | null = null;
  let globalAnnouncementTargets: string[] | null = null;
  const text = typeof legacy.announcement === "string" ? legacy.announcement.trim() : "";
  const updatedAt =
    typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString();
  const updatedBy =
    legacy.updatedBy === null || typeof legacy.updatedBy === "string" ? legacy.updatedBy : null;

  if (text) {
    const targets = legacy.announcementTargets;
    if (targets === null || targets === undefined) {
      globalAnnouncement = {
        text,
        updatedAt,
        updatedBy,
        level: DEFAULT_ANNOUNCEMENT_LEVEL,
      };
    } else {
      const usernames = targets.filter((username) => accountUsernames.includes(username));
      for (const username of usernames) {
        announcementsByUser[username] = {
          text,
          updatedAt,
          updatedBy,
          level: DEFAULT_ANNOUNCEMENT_LEVEL,
        };
      }
    }
  }

  return {
    globalAnnouncement,
    globalAnnouncementTargets,
    announcementsByUser,
    tweetHistoryByStore: normalizeTweetHistoryByStore(
      (raw as Record<string, unknown>).tweetHistoryByStore,
    ),
    debugMemo: typeof legacy.debugMemo === "string" ? legacy.debugMemo : "",
    updatedAt,
    updatedBy,
  };
}

export function createEmptyAdminSettings(): AdminSettings {
  return {
    globalAnnouncement: null,
    globalAnnouncementTargets: null,
    announcementsByUser: {},
    tweetHistoryByStore: {},
    debugMemo: "",
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}
