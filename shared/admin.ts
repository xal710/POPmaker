export const ADMIN_USERNAME = "administrator";

export function isAdministrator(username: string | null | undefined): boolean {
  return username === ADMIN_USERNAME;
}

export interface AccountAnnouncement {
  text: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AdminSettings {
  globalAnnouncement: AccountAnnouncement | null;
  announcementsByUser: Record<string, AccountAnnouncement>;
  debugMemo: string;
  updatedAt: string;
  updatedBy: string | null;
}

import type { TweetTemplateMode } from "./accountProfile";

export interface AdminAccountSummary {
  username: string;
  displayName?: string;
  isAdministrator: boolean;
  canUsePopPlacementOnline: boolean;
  canUseTradeFeatures: boolean;
  tweetTemplateMode: TweetTemplateMode;
  tweetTemplateCustom: string | null;
}

import type { AccountApplication } from "./accountRegistration";

export interface AdminSettingsResponse {
  accounts: AdminAccountSummary[];
  settings?: AdminSettings;
  applications?: AccountApplication[];
}

export interface AdminAnnouncementResponse {
  globalAnnouncement: string;
  globalUpdatedAt: string | null;
  userAnnouncement: string;
  userUpdatedAt: string | null;
}

export function getGlobalAnnouncement(settings: AdminSettings): AccountAnnouncement | null {
  const text = settings.globalAnnouncement?.text?.trim();
  if (!text) return null;
  return settings.globalAnnouncement;
}

export function hasGlobalAnnouncement(settings: AdminSettings): boolean {
  return getGlobalAnnouncement(settings) !== null;
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
    (record.updatedBy === null || typeof record.updatedBy === "string")
  );
}

function isAnnouncementsByUser(value: unknown): value is Record<string, AccountAnnouncement> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => isAccountAnnouncement(entry));
}

function normalizeGlobalAnnouncement(value: unknown): AccountAnnouncement | null {
  if (value === null || value === undefined) return null;
  if (!isAccountAnnouncement(value)) return null;
  return value.text.trim() ? value : null;
}

export function isAdminSettings(value: unknown): value is AdminSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isAnnouncementsByUser(record.announcementsByUser) &&
    (record.globalAnnouncement === null ||
      record.globalAnnouncement === undefined ||
      isAccountAnnouncement(record.globalAnnouncement)) &&
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
    },
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
      announcementsByUser: record.announcementsByUser,
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
  const text = typeof legacy.announcement === "string" ? legacy.announcement.trim() : "";
  const updatedAt =
    typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString();
  const updatedBy =
    legacy.updatedBy === null || typeof legacy.updatedBy === "string" ? legacy.updatedBy : null;

  if (text) {
    const targets = legacy.announcementTargets;
    if (targets === null || targets === undefined) {
      globalAnnouncement = { text, updatedAt, updatedBy };
    } else {
      const usernames = targets.filter((username) => accountUsernames.includes(username));
      for (const username of usernames) {
        announcementsByUser[username] = { text, updatedAt, updatedBy };
      }
    }
  }

  return {
    globalAnnouncement,
    announcementsByUser,
    debugMemo: typeof legacy.debugMemo === "string" ? legacy.debugMemo : "",
    updatedAt,
    updatedBy,
  };
}

export function createEmptyAdminSettings(): AdminSettings {
  return {
    globalAnnouncement: null,
    announcementsByUser: {},
    debugMemo: "",
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}
