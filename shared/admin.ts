export const ADMIN_USERNAME = "administrator";

export function isAdministrator(username: string | null | undefined): boolean {
  return username === ADMIN_USERNAME;
}

export interface AdminSettings {
  announcement: string;
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
