import { useEffect, useState } from "react";

import type { AdminAccountSummary, AdminSettings } from "../../shared/admin";
import { formatDateTime } from "../utils/format";

interface AdminToolsPanelProps {
  accounts: AdminAccountSummary[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSaveAnnouncement: (value: string) => Promise<boolean>;
  onSaveDebugMemo: (value: string) => Promise<boolean>;
  onAnnouncementSaved?: () => void;
}

export function AdminToolsPanel({
  accounts,
  settings,
  loading,
  saving,
  error,
  onSaveAnnouncement,
  onSaveDebugMemo,
  onAnnouncementSaved,
}: AdminToolsPanelProps) {
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [debugMemoDraft, setDebugMemoDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setAnnouncementDraft(settings?.announcement ?? "");
    setDebugMemoDraft(settings?.debugMemo ?? "");
  }, [settings]);

  const handleSaveAnnouncement = async () => {
    setSaveMessage(null);
    const ok = await onSaveAnnouncement(announcementDraft);
    if (ok) {
      setSaveMessage("アナウンスを保存しました");
      onAnnouncementSaved?.();
    }
  };

  const handleSaveDebugMemo = async () => {
    setSaveMessage(null);
    const ok = await onSaveDebugMemo(debugMemoDraft);
    if (ok) {
      setSaveMessage("デバッグメモを保存しました");
    }
  };

  return (
    <section className="admin-tools" aria-label="管理者ツール">
      <div className="admin-tools__header">
        <h2 className="admin-tools__title">管理者ツール</h2>
        <p className="admin-tools__subtitle">管理者モード中のみ表示されます</p>
      </div>

      {error && (
        <p className="admin-tools__error" role="alert">
          {error}
        </p>
      )}

      {saveMessage && (
        <p className="admin-tools__status" role="status">
          {saveMessage}
        </p>
      )}

      <div className="admin-tools__grid">
        <section className="admin-tools__card">
          <h3 className="admin-tools__card-title">ログインアカウント一覧</h3>
          {loading ? (
            <p className="admin-tools__muted">読み込み中...</p>
          ) : (
            <ul className="admin-account-list">
              {accounts.map((account) => (
                <li key={account.username} className="admin-account-list__item">
                  <span className="admin-account-list__name">{account.username}</span>
                  <span className="admin-account-list__badges">
                    {account.isAdministrator && (
                      <span className="admin-badge admin-badge--admin">管理者</span>
                    )}
                    {account.canUsePopPlacementOnline && (
                      <span className="admin-badge admin-badge--sync">POP配置同期</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-tools__card">
          <h3 className="admin-tools__card-title">アカウントへのアナウンス</h3>
          <p className="admin-tools__hint">
            保存すると、ログイン中の全アカウントの画面上部にお知らせが表示されます。
          </p>
          <textarea
            className="admin-tools__textarea"
            value={announcementDraft}
            onChange={(event) => setAnnouncementDraft(event.target.value)}
            rows={6}
            placeholder="例: 本日18時よりメンテナンスを行います。"
            disabled={loading || saving}
          />
          <div className="admin-tools__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSaveAnnouncement()}
              disabled={loading || saving}
            >
              {saving ? "保存中..." : "アナウンスを保存"}
            </button>
          </div>
        </section>

        <section className="admin-tools__card admin-tools__card--wide">
          <h3 className="admin-tools__card-title">管理者用デバッグメモ</h3>
          <p className="admin-tools__hint">
            管理者のみが閲覧・編集できます。運用メモや調査メモに使えます。
          </p>
          <textarea
            className="admin-tools__textarea admin-tools__textarea--mono"
            value={debugMemoDraft}
            onChange={(event) => setDebugMemoDraft(event.target.value)}
            rows={8}
            placeholder="デバッグ情報、調査メモ、TODO など"
            disabled={loading || saving}
          />
          <div className="admin-tools__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void handleSaveDebugMemo()}
              disabled={loading || saving}
            >
              {saving ? "保存中..." : "デバッグメモを保存"}
            </button>
            {settings?.updatedAt && (
              <span className="admin-tools__updated">
                最終更新: {formatDateTime(new Date(settings.updatedAt))}
                {settings.updatedBy ? `（${settings.updatedBy}）` : ""}
              </span>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
