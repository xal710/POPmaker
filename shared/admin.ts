export const ADMIN_USERNAME = "administrator";

export function isAdministrator(username: string | null | undefined): boolean {
  return username === ADMIN_USERNAME;
}

export interface AdminSettings {
  announcement: string;
  /** null のときは全アカウント向け */
  announcementTargets: string[] | null;
  debugMemo: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AdminAccountSummary {
  username: string;
  isAdministrator: boolean;
  canUsePopPlacementOnline: boolean;
}

export interface AdminSettingsResponse {
  accounts: AdminAccountSummary[];
  settings: AdminSettings;
}

export interface AdminAnnouncementResponse {
  announcement: string;
  updatedAt: string | null;
}

export function isAnnouncementVisibleToUser(
  settings: Pick<AdminSettings, "announcement" | "announcementTargets">,
  username: string,
): boolean {
  if (!settings.announcement.trim()) return false;

  const targets = settings.announcementTargets;
  if (targets === null || targets === undefined) return true;

  return targets.includes(username);
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
