import { useEffect, useMemo, useState } from "react";

import {
  normalizeAnnouncementTargets,
  resolveAnnouncementTargetSelection,
  type AdminAccountSummary,
  type AdminSettings,
} from "../../shared/admin";
import { formatDateTime } from "../utils/format";

interface AdminToolsPanelProps {
  accounts: AdminAccountSummary[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSaveAnnouncement: (announcement: string, targets: string[] | null) => Promise<boolean>;
  onDeleteAnnouncement: () => Promise<boolean>;
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
  onDeleteAnnouncement,
  onSaveDebugMemo,
  onAnnouncementSaved,
}: AdminToolsPanelProps) {
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [announcementTargetsDraft, setAnnouncementTargetsDraft] = useState<Set<string>>(new Set());
  const [debugMemoDraft, setDebugMemoDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const accountUsernames = useMemo(
    () => accounts.map((account) => account.username),
    [accounts],
  );

  useEffect(() => {
    setAnnouncementDraft(settings?.announcement ?? "");
    setDebugMemoDraft(settings?.debugMemo ?? "");
    setAnnouncementTargetsDraft(
      resolveAnnouncementTargetSelection(settings?.announcementTargets, accountUsernames),
    );
  }, [settings, accountUsernames]);

  const allTargetsSelected =
    accountUsernames.length > 0 && announcementTargetsDraft.size === accountUsernames.length;
  const selectedTargetCount = announcementTargetsDraft.size;

  const toggleAnnouncementTarget = (username: string) => {
    setAnnouncementTargetsDraft((current) => {
      const next = new Set(current);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const selectAllTargets = () => {
    setAnnouncementTargetsDraft(new Set(accountUsernames));
  };

  const clearAllTargets = () => {
    setAnnouncementTargetsDraft(new Set());
  };

  const handleSaveAnnouncement = async () => {
    setSaveMessage(null);
    const targets = normalizeAnnouncementTargets(
      [...announcementTargetsDraft],
      accountUsernames,
    );
    const ok = await onSaveAnnouncement(announcementDraft, targets);
    if (ok) {
      setSaveMessage("アナウンスを保存しました");
      onAnnouncementSaved?.();
    }
  };

  const handleDeleteAnnouncement = async () => {
    const hasSavedAnnouncement = Boolean(settings?.announcement.trim());
    const hasDraft = Boolean(announcementDraft.trim());
    if (!hasSavedAnnouncement && !hasDraft) return;

    if (
      hasSavedAnnouncement &&
      !window.confirm("保存済みのアナウンスを削除しますか？全アカウントの画面上部から消えます。")
    ) {
      return;
    }

    setSaveMessage(null);
    const ok = await onDeleteAnnouncement();
    if (ok) {
      setAnnouncementDraft("");
      setAnnouncementTargetsDraft(new Set(accountUsernames));
      setSaveMessage("アナウンスを削除しました");
      onAnnouncementSaved?.();
    }
  };

  const canDeleteAnnouncement = Boolean(settings?.announcement.trim() || announcementDraft.trim());

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
            配信先アカウントを選び、保存すると選択したアカウントの画面上部にお知らせが表示されます。
          </p>

          <div className="admin-target-picker">
            <div className="admin-target-picker__header">
              <p className="admin-target-picker__label">配信先</p>
              <div className="admin-target-picker__actions">
                <button
                  type="button"
                  className="admin-target-picker__link"
                  onClick={selectAllTargets}
                  disabled={loading || saving || allTargetsSelected}
                >
                  すべて選択
                </button>
                <button
                  type="button"
                  className="admin-target-picker__link"
                  onClick={clearAllTargets}
                  disabled={loading || saving || selectedTargetCount === 0}
                >
                  すべて解除
                </button>
              </div>
            </div>
            <ul className="admin-target-picker__list" aria-label="アナウンス配信先アカウント">
              {accounts.map((account) => {
                const checked = announcementTargetsDraft.has(account.username);
                return (
                  <li key={account.username}>
                    <label className="admin-target-picker__item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAnnouncementTarget(account.username)}
                        disabled={loading || saving}
                      />
                      <span className="admin-target-picker__name">{account.username}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="admin-target-picker__meta" role="status">
              {allTargetsSelected
                ? "全アカウントに配信"
                : `${selectedTargetCount.toLocaleString("ja-JP")} 件のアカウントに配信`}
            </p>
          </div>

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
              disabled={loading || saving || selectedTargetCount === 0}
            >
              {saving ? "保存中..." : "アナウンスを保存"}
            </button>
            <button
              type="button"
              className="btn btn--secondary admin-tools__delete-btn"
              onClick={() => void handleDeleteAnnouncement()}
              disabled={loading || saving || !canDeleteAnnouncement}
            >
              {saving ? "処理中..." : "アナウンスを削除"}
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
