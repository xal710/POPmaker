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
    debugMemo: "",
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}

function isValidSettings(value: unknown): value is AdminSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.announcement === "string" &&
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
    return parsed;
  } catch {
    return defaultSettings();
  }
}

export function saveAdminSettings(
  patch: Partial<Pick<AdminSettings, "announcement" | "debugMemo">>,
  updatedBy: string,
): AdminSettings {
  const current = readAdminSettings();
  const next: AdminSettings = {
    announcement: patch.announcement ?? current.announcement,
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
