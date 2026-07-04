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

export type AdminToolsTab = "accounts" | "announcements" | "applications";

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

const ADMIN_TAB_LABELS: Record<AdminToolsTab, string> = {
  accounts: "アカウント",
  announcements: "アナウンス・メモ",
  applications: "アカウント申請",
};

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
  onSaveAccountProfile,
  onAnnouncementSaved,
}: AdminToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminToolsTab>("accounts");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [debugMemoDraft, setDebugMemoDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const pendingApplicationCount = useMemo(
    () => applications.filter((application) => application.status === "pending").length,
    [applications],
  );

  const activeAnnouncementCount = useMemo(() => {
    if (!settings) return 0;
    return accounts.filter((account) => hasUserAnnouncement(settings, account.username)).length;
  }, [accounts, settings]);

  useEffect(() => {
    if (selectedUsername) return;
    if (accounts.length > 0) setSelectedUsername(accounts[0].username);
  }, [accounts, selectedUsername]);

  useEffect(() => {
    if (selectedProfileUsername) return;
    if (accounts.length > 0) setSelectedProfileUsername(accounts[0].username);
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
    if (ok) setSaveMessage("デバッグメモを保存しました");
  };

  const getTabBadge = (tab: AdminToolsTab): number | null => {
    if (tab === "applications" && pendingApplicationCount > 0) return pendingApplicationCount;
    if (tab === "announcements" && activeAnnouncementCount > 0) return activeAnnouncementCount;
    return null;
  };

  return (
    <section className="admin-tools" aria-label="管理者ツール">
      <div className="admin-tools__header">
        <h2 className="admin-tools__title">管理者ツール</h2>
        <p className="admin-tools__subtitle">アカウント管理・お知らせ・申請の承認を行います</p>
      </div>

      <div className="admin-tools__tabs" role="tablist" aria-label="管理者ツールのタブ">
        {(Object.keys(ADMIN_TAB_LABELS) as AdminToolsTab[]).map((tab) => {
          const badge = getTabBadge(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`admin-tab-${tab}`}
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab}`}
              className={`admin-tools__tab${isActive ? " admin-tools__tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {ADMIN_TAB_LABELS[tab]}
              {badge !== null && (
                <span className="admin-tools__tab-badge">{badge.toLocaleString("ja-JP")}</span>
              )}
            </button>
          );
        })}
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

      {activeTab === "accounts" && (
        <div
          id="admin-panel-accounts"
          role="tabpanel"
          aria-labelledby="admin-tab-accounts"
          className="admin-tools__tab-panel"
        >
          <div className="admin-tools__accounts-layout">
            <section className="admin-tools__card">
              <h3 className="admin-tools__card-title">ログインアカウント一覧</h3>
              <p className="admin-tools__hint">
                アカウントを選択して、POP配置・トレード機能・ツイートテンプレートを編集します。
              </p>
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

            <AccountProfilePanel
              account={selectedProfileAccount}
              saving={saving}
              onSave={onSaveAccountProfile}
            />
          </div>
        </div>
      )}

      {activeTab === "announcements" && (
        <div
          id="admin-panel-announcements"
          role="tabpanel"
          aria-labelledby="admin-tab-announcements"
          className="admin-tools__tab-panel"
        >
          <div className="admin-tools__announcements-layout">
            <section className="admin-tools__card">
              <h3 className="admin-tools__card-title">アカウント別アナウンス</h3>
              <p className="admin-tools__hint">
                選択したアカウントの画面上部にだけ、個別のお知らせを表示できます。
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
                rows={8}
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

            <section className="admin-tools__card">
              <h3 className="admin-tools__card-title">管理者用デバッグメモ</h3>
              <p className="admin-tools__hint">
                管理者のみが閲覧・編集できます。運用メモや調査メモに使えます。
              </p>
              <textarea
                className="admin-tools__textarea admin-tools__textarea--mono"
                value={debugMemoDraft}
                onChange={(event) => setDebugMemoDraft(event.target.value)}
                rows={14}
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
        </div>
      )}

      {activeTab === "applications" && (
        <div
          id="admin-panel-applications"
          role="tabpanel"
          aria-labelledby="admin-tab-applications"
          className="admin-tools__tab-panel"
        >
          <AccountApplicationsPanel
            applications={applications}
            saving={saving}
            onApprove={onApproveApplication}
            onReject={onRejectApplication}
          />
        </div>
      )}
    </section>
  );
}
