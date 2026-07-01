import { useCallback, useEffect, useState } from "react";

import type { AdminAccountSummary, AdminSettings, AdminSettingsResponse } from "../../shared/admin";

interface UseAdminPanelResult {
  accounts: AdminAccountSummary[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveAnnouncement: (announcement: string, targets: string[] | null) => Promise<boolean>;
  deleteAnnouncement: () => Promise<boolean>;
  saveDebugMemo: (value: string) => Promise<boolean>;
}

export function useAdminPanel(enabled: boolean): UseAdminPanelResult {
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setAccounts([]);
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
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setSettings(data.settings ?? null);
    } catch (err) {
      setAccounts([]);
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
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setSettings(data.settings ?? null);
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
    settings,
    loading,
    saving,
    error,
    reload,
    saveAnnouncement,
    deleteAnnouncement,
    saveDebugMemo,
  };
}
