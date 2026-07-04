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
  announcement: string;
  updatedAt: string | null;
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

export function countActiveAnnouncements(settings: AdminSettings): number {
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

export function isAdminSettings(value: unknown): value is AdminSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isAnnouncementsByUser(record.announcementsByUser) &&
    typeof record.debugMemo === "string" &&
    typeof record.updatedAt === "string" &&
    (record.updatedBy === null || typeof record.updatedBy === "string")
  );
}

export function normalizeAdminSettings(
  raw: unknown,
  accountUsernames: string[],
): AdminSettings {
  if (isAdminSettings(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== "object") {
    return createEmptyAdminSettings();
  }

  const legacy = raw as LegacyAdminSettings;
  const announcementsByUser: Record<string, AccountAnnouncement> = {};
  const text = typeof legacy.announcement === "string" ? legacy.announcement.trim() : "";
  const updatedAt =
    typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString();
  const updatedBy =
    legacy.updatedBy === null || typeof legacy.updatedBy === "string" ? legacy.updatedBy : null;

  if (text) {
    const targets = legacy.announcementTargets;
    const usernames =
      targets === null || targets === undefined
        ? accountUsernames
        : targets.filter((username) => accountUsernames.includes(username));

    for (const username of usernames) {
      announcementsByUser[username] = { text, updatedAt, updatedBy };
    }
  }

  return {
    announcementsByUser,
    debugMemo: typeof legacy.debugMemo === "string" ? legacy.debugMemo : "",
    updatedAt,
    updatedBy,
  };
}

export function createEmptyAdminSettings(): AdminSettings {
  return {
    announcementsByUser: {},
    debugMemo: "",
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}
