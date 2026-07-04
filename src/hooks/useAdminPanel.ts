import { useCallback, useEffect, useState } from "react";

import type { AccountApplication } from "../../shared/accountRegistration";
import type { AdminAccountSummary, AdminSettings, AdminSettingsResponse } from "../../shared/admin";

interface UseAdminPanelResult {
  accounts: AdminAccountSummary[];
  applications: AccountApplication[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveAnnouncement: (announcement: string, targets: string[] | null) => Promise<boolean>;
  deleteAnnouncement: () => Promise<boolean>;
  saveDebugMemo: (value: string) => Promise<boolean>;
  approveApplication: (applicationId: string, canUsePopPlacement: boolean) => Promise<boolean>;
  rejectApplication: (applicationId: string) => Promise<boolean>;
  setPopPlacementAccess: (username: string, enabled: boolean) => Promise<boolean>;
}

function applyAdminResponse(
  data: AdminSettingsResponse,
  setAccounts: (accounts: AdminAccountSummary[]) => void,
  setApplications: (applications: AccountApplication[]) => void,
  setSettings: (settings: AdminSettings | null) => void,
): void {
  setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
  setApplications(Array.isArray(data.applications) ? data.applications : []);
  setSettings(data.settings ?? null);
}

export function useAdminPanel(enabled: boolean): UseAdminPanelResult {
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [applications, setApplications] = useState<AccountApplication[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setAccounts([]);
      setApplications([]);
      setSettings(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/settings?t=${Date.now()}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "管理者設定の取得に失敗しました");
      }

      const data = (await response.json()) as AdminSettingsResponse;
      applyAdminResponse(data, setAccounts, setApplications, setSettings);
    } catch (err) {
      setAccounts([]);
      setApplications([]);
      setSettings(null);
      setError(err instanceof Error ? err.message : "管理者設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchSettings = useCallback(
    async (patch: {
      announcement?: string;
      announcementTargets?: string[] | null;
      debugMemo?: string;
    }) => {
      setSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "保存に失敗しました");
        }

        const data = (await response.json()) as AdminSettingsResponse;
        applyAdminResponse(data, setAccounts, setApplications, setSettings);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const postApplicationAction = useCallback(
    async (url: string, body?: Record<string, unknown>) => {
      setSaving(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "操作に失敗しました");
        }

        const data = (await response.json()) as AdminSettingsResponse;
        applyAdminResponse(data, setAccounts, setApplications, setSettings);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作に失敗しました");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const approveApplication = useCallback(
    async (applicationId: string, canUsePopPlacement: boolean) =>
      postApplicationAction(`/api/admin/account-applications/${encodeURIComponent(applicationId)}/approve`, {
        canUsePopPlacement,
      }),
    [postApplicationAction],
  );

  const rejectApplication = useCallback(
    async (applicationId: string) =>
      postApplicationAction(`/api/admin/account-applications/${encodeURIComponent(applicationId)}/reject`),
    [postApplicationAction],
  );

  const setPopPlacementAccess = useCallback(async (username: string, enabled: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/accounts/${encodeURIComponent(username)}/pop-placement`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canUsePopPlacement: enabled }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "更新に失敗しました");
      }

      const data = (await response.json()) as AdminSettingsResponse;
      applyAdminResponse(data, setAccounts, setApplications, setSettings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveAnnouncement = useCallback(
    async (announcement: string, targets: string[] | null) =>
      patchSettings({ announcement, announcementTargets: targets }),
    [patchSettings],
  );

  const deleteAnnouncement = useCallback(
    async () => patchSettings({ announcement: "", announcementTargets: null }),
    [patchSettings],
  );

  const saveDebugMemo = useCallback(
    async (value: string) => patchSettings({ debugMemo: value }),
    [patchSettings],
  );

  return {
    accounts,
    applications,
    settings,
    loading,
    saving,
    error,
    reload,
    saveAnnouncement,
    deleteAnnouncement,
    saveDebugMemo,
    approveApplication,
    rejectApplication,
    setPopPlacementAccess,
  };
}
