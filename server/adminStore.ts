import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AdminSettings } from "../shared/admin";
import { getDataDir } from "./config";

const ADMIN_SETTINGS_FILENAME = "admin-settings.json";

function getAdminSettingsPath(): string {
  return resolve(getDataDir(), ADMIN_SETTINGS_FILENAME);
}

function defaultSettings(): AdminSettings {
  return {
    announcement: "",
    announcementTargets: null,
    debugMemo: "",
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}

function isValidAnnouncementTargets(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => typeof entry === "string");
}

function isValidSettings(value: unknown): value is AdminSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.announcement === "string" &&
    isValidAnnouncementTargets(record.announcementTargets) &&
    typeof record.debugMemo === "string" &&
    typeof record.updatedAt === "string" &&
    (record.updatedBy === null || typeof record.updatedBy === "string")
  );
}

export function readAdminSettings(): AdminSettings {
  const path = getAdminSettingsPath();
  if (!existsSync(path)) return defaultSettings();

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    if (!isValidSettings(parsed)) return defaultSettings();
    return {
      ...parsed,
      announcementTargets: parsed.announcementTargets ?? null,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveAdminSettings(
  patch: Partial<Pick<AdminSettings, "announcement" | "announcementTargets" | "debugMemo">>,
  updatedBy: string,
): AdminSettings {
  const current = readAdminSettings();
  const next: AdminSettings = {
    announcement: patch.announcement ?? current.announcement,
    announcementTargets:
      patch.announcementTargets !== undefined
        ? patch.announcementTargets
        : current.announcementTargets,
    debugMemo: patch.debugMemo ?? current.debugMemo,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const path = getAdminSettingsPath();
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function ensureAdminSettingsFile(): void {
  const path = getAdminSettingsPath();
  if (existsSync(path)) return;

  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(defaultSettings(), null, 2), "utf-8");
}
