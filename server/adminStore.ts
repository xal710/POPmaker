import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createEmptyAdminSettings,
  isAdminSettings,
  normalizeAdminSettings,
  normalizeAnnouncementLevel,
  type AccountAnnouncement,
  type AdminSettings,
  type AnnouncementLevel,
} from "../shared/admin";
import { normalizeTweetHistoryByStore } from "../shared/tweetHistoryAccounts";
import { getDataDir } from "./config";

const ADMIN_SETTINGS_FILENAME = "admin-settings.json";

function getAdminSettingsPath(): string {
  return resolve(getDataDir(), ADMIN_SETTINGS_FILENAME);
}

function readRawAdminSettings(): unknown {
  const path = getAdminSettingsPath();
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf-8")) as unknown;
  } catch {
    return null;
  }
}

function writeAdminSettings(settings: AdminSettings): AdminSettings {
  const path = getAdminSettingsPath();
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}

export function readAdminSettings(accountUsernames: string[] = []): AdminSettings {
  const raw = readRawAdminSettings();
  if (!raw) return createEmptyAdminSettings();

  const normalized = normalizeAdminSettings(raw, accountUsernames);

  if (accountUsernames.length === 0) {
    return normalized;
  }

  const rawRecord = raw as Record<string, unknown>;
  const shouldPersist =
    !isAdminSettings(raw) ||
    !("globalAnnouncement" in rawRecord) ||
    !("globalAnnouncementTargets" in rawRecord) ||
    (isAdminSettings(raw) &&
      !getGlobalAnnouncementFromRaw(raw) &&
      normalized.globalAnnouncement !== null &&
      Object.keys(normalized.announcementsByUser).length === 0 &&
      Object.keys((raw as AdminSettings).announcementsByUser).length > 0);

  if (shouldPersist) {
    return writeAdminSettings(normalized);
  }

  return normalized;
}

function getGlobalAnnouncementFromRaw(raw: unknown): AccountAnnouncement | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!record.globalAnnouncement || typeof record.globalAnnouncement !== "object") return null;
  const announcement = record.globalAnnouncement as AccountAnnouncement;
  return announcement.text?.trim() ? announcement : null;
}

export interface SaveAdminSettingsPatch {
  debugMemo?: string;
  globalAnnouncement?: string;
  globalAnnouncementLevel?: AnnouncementLevel;
  globalAnnouncementTargets?: string[] | null;
  deleteGlobalAnnouncement?: boolean;
  userAnnouncement?: {
    username: string;
    text: string;
    level?: AnnouncementLevel;
  };
  deleteUserAnnouncement?: string;
  tweetHistoryByStore?: Record<string, string>;
}

export function saveAdminSettings(
  patch: SaveAdminSettingsPatch,
  accountUsernames: string[],
  updatedBy: string,
): AdminSettings {
  const current = readAdminSettings(accountUsernames);
  const now = new Date().toISOString();
  const next: AdminSettings = {
    ...current,
    announcementsByUser: { ...current.announcementsByUser },
    tweetHistoryByStore: { ...current.tweetHistoryByStore },
    updatedAt: now,
    updatedBy,
  };

  if (patch.debugMemo !== undefined) {
    next.debugMemo = patch.debugMemo;
  }

  if (patch.globalAnnouncement !== undefined) {
    const text = patch.globalAnnouncement.trim();
    next.globalAnnouncement = text
      ? {
          text,
          updatedAt: now,
          updatedBy,
          level: normalizeAnnouncementLevel(
            patch.globalAnnouncementLevel ?? current.globalAnnouncement?.level,
          ),
        }
      : null;
    if (!text) {
      next.globalAnnouncementTargets = null;
    }
  } else if (patch.globalAnnouncementLevel !== undefined && next.globalAnnouncement) {
    next.globalAnnouncement = {
      ...next.globalAnnouncement,
      level: normalizeAnnouncementLevel(patch.globalAnnouncementLevel),
      updatedAt: now,
      updatedBy,
    };
  }

  if (patch.globalAnnouncementTargets !== undefined) {
    next.globalAnnouncementTargets = patch.globalAnnouncementTargets;
  }

  if (patch.deleteGlobalAnnouncement) {
    next.globalAnnouncement = null;
    next.globalAnnouncementTargets = null;
  }

  if (patch.userAnnouncement) {
    const username = patch.userAnnouncement.username.trim();
    const text = patch.userAnnouncement.text.trim();

    if (!username || !accountUsernames.includes(username)) {
      throw new Error("INVALID_ANNOUNCEMENT_USER");
    }

    if (text) {
      next.announcementsByUser[username] = {
        text,
        updatedAt: now,
        updatedBy,
        level: normalizeAnnouncementLevel(
          patch.userAnnouncement.level ?? current.announcementsByUser[username]?.level,
        ),
      };
    } else {
      delete next.announcementsByUser[username];
    }
  }

  if (patch.deleteUserAnnouncement) {
    const username = patch.deleteUserAnnouncement.trim();
    if (!username || !accountUsernames.includes(username)) {
      throw new Error("INVALID_ANNOUNCEMENT_USER");
    }
    delete next.announcementsByUser[username];
  }

  if (patch.tweetHistoryByStore !== undefined) {
    next.tweetHistoryByStore = normalizeTweetHistoryByStore(patch.tweetHistoryByStore);
  }

  return writeAdminSettings(next);
}

export function ensureAdminSettingsFile(): void {
  const path = getAdminSettingsPath();
  if (existsSync(path)) return;

  writeAdminSettings(createEmptyAdminSettings());
}

export type { AccountAnnouncement };
