import { useEffect, useMemo, useState } from "react";

import {
  hasUserAnnouncement,
  type AdminAccountSummary,
  type AdminSettings,
} from "../../shared/admin";
import type { AccountApplication } from "../../shared/accountRegistration";
import { AccountApplicationsPanel } from "./AccountApplicationsPanel";
import { AccountProfilePanel } from "./AccountProfilePanel";
import { formatDateTime } from "../utils/format";

interface AdminToolsPanelProps {
  accounts: AdminAccountSummary[];
  applications: AccountApplication[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSaveUserAnnouncement: (username: string, text: string) => Promise<boolean>;
  onDeleteUserAnnouncement: (username: string) => Promise<boolean>;
  onSaveDebugMemo: (value: string) => Promise<boolean>;
  onApproveApplication: (
    applicationId: string,
    canUsePopPlacement: boolean,
    canUseTradeFeatures: boolean,
  ) => Promise<boolean>;
  onRejectApplication: (applicationId: string) => Promise<boolean>;
  onTogglePopPlacement: (username: string, enabled: boolean) => Promise<boolean>;
  onToggleTradeFeatures: (username: string, enabled: boolean) => Promise<boolean>;
  onSaveAccountProfile: (
    username: string,
    patch: {
      canUsePopPlacement: boolean;
      canUseTradeFeatures: boolean;
      tweetTemplateMode: import("../../shared/accountProfile").TweetTemplateMode;
      tweetTemplateCustom: string | null;
    },
  ) => Promise<boolean>;
  onAnnouncementSaved?: () => void;
}

export function AdminToolsPanel({
  accounts,
  applications,
  settings,
  loading,
  saving,
  error,
  onSaveUserAnnouncement,
  onDeleteUserAnnouncement,
  onSaveDebugMemo,
  onApproveApplication,
  onRejectApplication,
  onTogglePopPlacement,
  onToggleTradeFeatures,
  onSaveAccountProfile,
  onAnnouncementSaved,
}: AdminToolsPanelProps) {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [debugMemoDraft, setDebugMemoDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUsername) return;
    if (accounts.length > 0) {
      setSelectedUsername(accounts[0].username);
    }
  }, [accounts, selectedUsername]);

  useEffect(() => {
    if (selectedProfileUsername) return;
    if (accounts.length > 0) {
      setSelectedProfileUsername(accounts[0].username);
    }
  }, [accounts, selectedProfileUsername]);

  const selectedProfileAccount = useMemo(
    () => accounts.find((account) => account.username === selectedProfileUsername) ?? null,
    [accounts, selectedProfileUsername],
  );

  useEffect(() => {
    setDebugMemoDraft(settings?.debugMemo ?? "");
  }, [settings?.debugMemo]);

  useEffect(() => {
    if (!selectedUsername) {
      setAnnouncementDraft("");
      return;
    }
    setAnnouncementDraft(settings?.announcementsByUser[selectedUsername]?.text ?? "");
  }, [settings, selectedUsername]);

  const selectedAnnouncement = selectedUsername
    ? settings?.announcementsByUser[selectedUsername] ?? null
    : null;

  const activeAnnouncementCount = useMemo(() => {
    if (!settings) return 0;
    return accounts.filter((account) => hasUserAnnouncement(settings, account.username)).length;
  }, [accounts, settings]);

  const handleSaveAnnouncement = async () => {
    if (!selectedUsername) return;

    setSaveMessage(null);
    const ok = await onSaveUserAnnouncement(selectedUsername, announcementDraft);
    if (ok) {
      setSaveMessage(`${selectedUsername} 向けのアナウンスを保存しました`);
      onAnnouncementSaved?.();
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedUsername) return;

    const hasSavedAnnouncement = Boolean(selectedAnnouncement?.text.trim());
    const hasDraft = Boolean(announcementDraft.trim());
    if (!hasSavedAnnouncement && !hasDraft) return;

    if (
      hasSavedAnnouncement &&
      !window.confirm(`${selectedUsername} 向けの保存済みアナウンスを削除しますか？`)
    ) {
      return;
    }

    setSaveMessage(null);
    const ok = await onDeleteUserAnnouncement(selectedUsername);
    if (ok) {
      setAnnouncementDraft("");
      setSaveMessage(`${selectedUsername} 向けのアナウンスを削除しました`);
      onAnnouncementSaved?.();
    }
  };

  const canDeleteAnnouncement = Boolean(
    selectedAnnouncement?.text.trim() || announcementDraft.trim(),
  );

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
          <p className="admin-tools__hint">アカウントを選択すると、下の設定パネルで詳細を編集できます。</p>
          {loading ? (
            <p className="admin-tools__muted">読み込み中...</p>
          ) : (
            <ul className="admin-account-list admin-account-list--selectable">
              {accounts.map((account) => {
                const isSelected = selectedProfileUsername === account.username;
                return (
                  <li key={account.username}>
                    <button
                      type="button"
                      className={`admin-account-list__item admin-account-list__select${
                        isSelected ? " admin-account-list__select--active" : ""
                      }`}
                      onClick={() => setSelectedProfileUsername(account.username)}
                      aria-pressed={isSelected}
                    >
                      <span className="admin-account-list__name">{account.username}</span>
                      <span className="admin-account-list__badges">
                        {account.isAdministrator && (
                          <span className="admin-badge admin-badge--admin">管理者</span>
                        )}
                        {account.canUsePopPlacementOnline && (
                          <span className="admin-badge admin-badge--sync">POP配置</span>
                        )}
                        {account.canUseTradeFeatures && (
                          <span className="admin-badge admin-badge--trade">トレード機能</span>
                        )}
                        {account.tweetTemplateMode === "custom" && (
                          <span className="admin-badge admin-badge--announcement">独自テンプレ</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="admin-tools__card">
          <h3 className="admin-tools__card-title">アカウント別アナウンス</h3>
          <p className="admin-tools__hint">
            アカウントごとに別の文面を保存できます。選択したアカウントにだけ画面上部のお知らせが表示されます。
          </p>

          <div className="admin-target-picker">
            <div className="admin-target-picker__header">
              <p className="admin-target-picker__label">編集するアカウント</p>
            </div>
            <ul className="admin-target-picker__list" aria-label="アナウンス編集対象アカウント">
              {accounts.map((account) => {
                const isSelected = selectedUsername === account.username;
                const isActive = settings
                  ? hasUserAnnouncement(settings, account.username)
                  : false;

                return (
                  <li key={account.username}>
                    <button
                      type="button"
                      className={`admin-target-picker__select${
                        isSelected ? " admin-target-picker__select--active" : ""
                      }`}
                      onClick={() => setSelectedUsername(account.username)}
                      disabled={loading || saving}
                      aria-pressed={isSelected}
                    >
                      <span className="admin-target-picker__name">{account.username}</span>
                      {isActive && (
                        <span className="admin-badge admin-badge--announcement">配信中</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="admin-target-picker__meta" role="status">
              {activeAnnouncementCount.toLocaleString("ja-JP")} 件のアカウントに個別アナウンスを設定中
            </p>
          </div>

          <textarea
            className="admin-tools__textarea"
            value={announcementDraft}
            onChange={(event) => setAnnouncementDraft(event.target.value)}
            rows={6}
            placeholder={
              selectedUsername
                ? `${selectedUsername} 向けのお知らせを入力`
                : "アカウントを選択してください"
            }
            disabled={loading || saving || !selectedUsername}
          />

          {selectedAnnouncement?.updatedAt && (
            <p className="admin-tools__updated">
              最終更新: {formatDateTime(new Date(selectedAnnouncement.updatedAt))}
              {selectedAnnouncement.updatedBy ? `（${selectedAnnouncement.updatedBy}）` : ""}
            </p>
          )}

          <div className="admin-tools__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSaveAnnouncement()}
              disabled={loading || saving || !selectedUsername}
            >
              {saving ? "保存中..." : "このアカウント向けに保存"}
            </button>
            <button
              type="button"
              className="btn btn--secondary admin-tools__delete-btn"
              onClick={() => void handleDeleteAnnouncement()}
              disabled={loading || saving || !selectedUsername || !canDeleteAnnouncement}
            >
              {saving ? "処理中..." : "このアカウント向けを削除"}
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

      <AccountProfilePanel
        account={selectedProfileAccount}
        saving={saving}
        onSave={onSaveAccountProfile}
      />

      <AccountApplicationsPanel
        accounts={accounts}
        applications={applications}
        saving={saving}
        onApprove={onApproveApplication}
        onReject={onRejectApplication}
        onTogglePopPlacement={onTogglePopPlacement}
        onToggleTradeFeatures={onToggleTradeFeatures}
      />
    </section>
  );
}
