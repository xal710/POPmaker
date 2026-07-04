import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createEmptyAdminSettings,
  isAdminSettings,
  normalizeAdminSettings,
  type AccountAnnouncement,
  type AdminSettings,
} from "../shared/admin";
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
  if (isAdminSettings(raw)) {
    return normalized;
  }

  if (accountUsernames.length > 0) {
    return writeAdminSettings(normalized);
  }

  return normalized;
}

export interface SaveAdminSettingsPatch {
  debugMemo?: string;
  userAnnouncement?: {
    username: string;
    text: string;
  };
  deleteUserAnnouncement?: string;
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
    updatedAt: now,
    updatedBy,
  };

  if (patch.debugMemo !== undefined) {
    next.debugMemo = patch.debugMemo;
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

  return writeAdminSettings(next);
}

export function ensureAdminSettingsFile(): void {
  const path = getAdminSettingsPath();
  if (existsSync(path)) return;

  writeAdminSettings(createEmptyAdminSettings());
}

export type { AccountAnnouncement };
