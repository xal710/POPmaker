import { useEffect, useMemo, useState } from "react";

import {
  ANNOUNCEMENT_LEVEL_OPTIONS,
  DEFAULT_ANNOUNCEMENT_LEVEL,
  countActiveUserAnnouncements,
  getGlobalAnnouncement,
  hasGlobalAnnouncement,
  hasUserAnnouncement,
  normalizeAnnouncementLevel,
  normalizeAnnouncementTargets,
  resolveAnnouncementTargetSelection,
  type AdminAccountSummary,
  type AdminSettings,
  type AnnouncementLevel,
} from "../../shared/admin";
import type { AccountApplication } from "../../shared/accountRegistration";
import {
  collectAccountStoreNames,
  formatTweetHistoryProfileUrl,
  parseTweetHistoryProfileInput,
} from "../../shared/tweetHistoryAccounts";
import { HARERUYA_ANNEX_SCREEN_NAME } from "../../shared/tweetHistoryParse";
import { AccountApplicationsPanel } from "./AccountApplicationsPanel";
import { AccountProfilePanel } from "./AccountProfilePanel";
import { formatDateTime } from "../utils/format";

export type AdminToolsTab =
  | "accounts"
  | "globalAnnouncement"
  | "userAnnouncements"
  | "tweetHistory"
  | "debugMemo"
  | "applications";

interface AdminToolsPanelProps {
  accounts: AdminAccountSummary[];
  applications: AccountApplication[];
  settings: AdminSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSaveGlobalAnnouncement: (
    text: string,
    targets: string[] | null,
    level: AnnouncementLevel,
  ) => Promise<boolean>;
  onDeleteGlobalAnnouncement: () => Promise<boolean>;
  onSaveUserAnnouncement: (
    username: string,
    text: string,
    level: AnnouncementLevel,
  ) => Promise<boolean>;
  onDeleteUserAnnouncement: (username: string) => Promise<boolean>;
  onSaveDebugMemo: (value: string) => Promise<boolean>;
  onSaveTweetHistoryByStore: (byStore: Record<string, string>) => Promise<boolean>;
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
      store: string | null;
    },
  ) => Promise<boolean>;
  onSetAccountSuspended: (username: string, suspended: boolean) => Promise<boolean>;
  onAnnouncementSaved?: () => void;
}

const ADMIN_TAB_LABELS: Record<AdminToolsTab, string> = {
  accounts: "アカウント",
  globalAnnouncement: "全体アナウンス",
  userAnnouncements: "個別アナウンス",
  tweetHistory: "ツイート履歴",
  debugMemo: "デバッグメモ",
  applications: "アカウント申請",
};

function accountHolderLabel(account: AdminAccountSummary): string {
  const displayName = account.displayName?.trim();
  return displayName || account.username;
}

function AnnouncementLevelPicker({
  value,
  disabled,
  name,
  onChange,
}: {
  value: AnnouncementLevel;
  disabled: boolean;
  name: string;
  onChange: (level: AnnouncementLevel) => void;
}) {
  return (
    <fieldset className="announcement-level-picker" disabled={disabled}>
      <legend className="announcement-level-picker__legend">重要度</legend>
      <div className="announcement-level-picker__options">
        {ANNOUNCEMENT_LEVEL_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`announcement-level-picker__option announcement-level-picker__option--${option.value}${
              value === option.value ? " announcement-level-picker__option--selected" : ""
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AdminToolsPanel({
  accounts,
  applications,
  settings,
  loading,
  saving,
  error,
  onSaveGlobalAnnouncement,
  onDeleteGlobalAnnouncement,
  onSaveUserAnnouncement,
  onDeleteUserAnnouncement,
  onSaveDebugMemo,
  onSaveTweetHistoryByStore,
  onApproveApplication,
  onRejectApplication,
  onSaveAccountProfile,
  onSetAccountSuspended,
  onAnnouncementSaved,
}: AdminToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminToolsTab>("accounts");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [globalAnnouncementDraft, setGlobalAnnouncementDraft] = useState("");
  const [globalAnnouncementLevelDraft, setGlobalAnnouncementLevelDraft] =
    useState<AnnouncementLevel>(DEFAULT_ANNOUNCEMENT_LEVEL);
  const [globalAnnouncementTargetsDraft, setGlobalAnnouncementTargetsDraft] = useState<Set<string>>(
    new Set(),
  );
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [announcementLevelDraft, setAnnouncementLevelDraft] =
    useState<AnnouncementLevel>(DEFAULT_ANNOUNCEMENT_LEVEL);
  const [debugMemoDraft, setDebugMemoDraft] = useState("");
  const [tweetHistoryDraft, setTweetHistoryDraft] = useState<Record<string, string>>({});
  const [tweetHistoryStoreOrder, setTweetHistoryStoreOrder] = useState<string[]>([]);
  const [newTweetHistoryStore, setNewTweetHistoryStore] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const pendingApplicationCount = useMemo(
    () => applications.filter((application) => application.status === "pending").length,
    [applications],
  );

  const activeUserAnnouncementCount = useMemo(() => {
    if (!settings) return 0;
    return countActiveUserAnnouncements(settings);
  }, [settings]);

  const globalAnnouncementActive = settings ? hasGlobalAnnouncement(settings) : false;

  const accountUsernames = useMemo(
    () => accounts.map((account) => account.username),
    [accounts],
  );

  const allGlobalTargetsSelected =
    accountUsernames.length > 0 &&
    globalAnnouncementTargetsDraft.size === accountUsernames.length;
  const selectedGlobalTargetCount = globalAnnouncementTargetsDraft.size;

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
    const fromAccounts = collectAccountStoreNames(accounts);
    const fromSettings = Object.keys(settings?.tweetHistoryByStore ?? {})
      .map((store) => store.trim())
      .filter(Boolean);
    const merged = [...new Set([...fromAccounts, ...fromSettings])].sort((a, b) =>
      a.localeCompare(b, "ja"),
    );
    setTweetHistoryStoreOrder(merged);

    const next: Record<string, string> = {};
    const byStore = settings?.tweetHistoryByStore ?? {};
    for (const store of merged) {
      const screen = byStore[store];
      next[store] = screen ? formatTweetHistoryProfileUrl(screen) : "";
    }
    setTweetHistoryDraft(next);
  }, [accounts, settings?.tweetHistoryByStore]);

  useEffect(() => {
    setGlobalAnnouncementDraft(settings?.globalAnnouncement?.text ?? "");
    setGlobalAnnouncementLevelDraft(
      normalizeAnnouncementLevel(settings?.globalAnnouncement?.level),
    );
    setGlobalAnnouncementTargetsDraft(
      resolveAnnouncementTargetSelection(settings?.globalAnnouncementTargets, accountUsernames),
    );
  }, [
    settings?.globalAnnouncement?.text,
    settings?.globalAnnouncement?.level,
    settings?.globalAnnouncementTargets,
    accountUsernames,
  ]);

  useEffect(() => {
    if (!selectedUsername) {
      setAnnouncementDraft("");
      setAnnouncementLevelDraft(DEFAULT_ANNOUNCEMENT_LEVEL);
      return;
    }
    setAnnouncementDraft(settings?.announcementsByUser[selectedUsername]?.text ?? "");
    setAnnouncementLevelDraft(
      normalizeAnnouncementLevel(settings?.announcementsByUser[selectedUsername]?.level),
    );
  }, [settings, selectedUsername]);

  const savedGlobalAnnouncement = settings ? getGlobalAnnouncement(settings) : null;
  const selectedAnnouncement = selectedUsername
    ? settings?.announcementsByUser[selectedUsername] ?? null
    : null;

  const toggleGlobalAnnouncementTarget = (username: string) => {
    setGlobalAnnouncementTargetsDraft((current) => {
      const next = new Set(current);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const selectAllGlobalTargets = () => {
    setGlobalAnnouncementTargetsDraft(new Set(accountUsernames));
  };

  const clearAllGlobalTargets = () => {
    setGlobalAnnouncementTargetsDraft(new Set());
  };

  const handleSaveGlobalAnnouncement = async () => {
    setSaveMessage(null);
    const targets = normalizeAnnouncementTargets(
      [...globalAnnouncementTargetsDraft],
      accountUsernames,
    );
    const ok = await onSaveGlobalAnnouncement(
      globalAnnouncementDraft,
      targets,
      globalAnnouncementLevelDraft,
    );
    if (ok) {
      setSaveMessage("全体アナウンスを保存しました");
      onAnnouncementSaved?.();
    }
  };

  const handleDeleteGlobalAnnouncement = async () => {
    const hasSaved = Boolean(savedGlobalAnnouncement?.text.trim());
    const hasDraft = Boolean(globalAnnouncementDraft.trim());
    if (!hasSaved && !hasDraft) return;

    if (hasSaved && !window.confirm("保存済みの全体アナウンスを削除しますか？")) {
      return;
    }

    setSaveMessage(null);
    const ok = await onDeleteGlobalAnnouncement();
    if (ok) {
      setGlobalAnnouncementDraft("");
      setGlobalAnnouncementLevelDraft(DEFAULT_ANNOUNCEMENT_LEVEL);
      setSaveMessage("全体アナウンスを削除しました");
      onAnnouncementSaved?.();
    }
  };

  const canDeleteGlobalAnnouncement = Boolean(
    savedGlobalAnnouncement?.text.trim() || globalAnnouncementDraft.trim(),
  );

  const handleSaveUserAnnouncement = async () => {
    if (!selectedUsername) return;

    setSaveMessage(null);
    const ok = await onSaveUserAnnouncement(
      selectedUsername,
      announcementDraft,
      announcementLevelDraft,
    );
    if (ok) {
      setSaveMessage(`${selectedUsername} 向けの個別アナウンスを保存しました`);
      onAnnouncementSaved?.();
    }
  };

  const handleDeleteUserAnnouncement = async () => {
    if (!selectedUsername) return;

    const hasSavedAnnouncement = Boolean(selectedAnnouncement?.text.trim());
    const hasDraft = Boolean(announcementDraft.trim());
    if (!hasSavedAnnouncement && !hasDraft) return;

    if (
      hasSavedAnnouncement &&
      !window.confirm(`${selectedUsername} 向けの保存済み個別アナウンスを削除しますか？`)
    ) {
      return;
    }

    setSaveMessage(null);
    const ok = await onDeleteUserAnnouncement(selectedUsername);
    if (ok) {
      setAnnouncementDraft("");
      setAnnouncementLevelDraft(DEFAULT_ANNOUNCEMENT_LEVEL);
      setSaveMessage(`${selectedUsername} 向けの個別アナウンスを削除しました`);
      onAnnouncementSaved?.();
    }
  };

  const canDeleteUserAnnouncement = Boolean(
    selectedAnnouncement?.text.trim() || announcementDraft.trim(),
  );

  const handleSaveDebugMemo = async () => {
    setSaveMessage(null);
    const ok = await onSaveDebugMemo(debugMemoDraft);
    if (ok) setSaveMessage("デバッグメモを保存しました");
  };

  const handleSaveTweetHistory = async () => {
    setSaveMessage(null);
    const next: Record<string, string> = {};
    for (const store of tweetHistoryStoreOrder) {
      const raw = tweetHistoryDraft[store]?.trim() ?? "";
      if (!raw) continue;
      const screen = parseTweetHistoryProfileInput(raw);
      if (!screen) {
        setSaveMessage(`「${store}」のURLまたは @名が不正です`);
        return;
      }
      next[store] = screen;
    }
    const ok = await onSaveTweetHistoryByStore(next);
    if (ok) setSaveMessage("店舗別ツイート履歴URLを保存しました");
  };

  const handleAddTweetHistoryStore = () => {
    const store = newTweetHistoryStore.trim();
    if (!store) return;
    setTweetHistoryStoreOrder((prev) =>
      prev.includes(store) ? prev : [...prev, store].sort((a, b) => a.localeCompare(b, "ja")),
    );
    setTweetHistoryDraft((prev) => ({ ...prev, [store]: prev[store] ?? "" }));
    setNewTweetHistoryStore("");
  };

  const getTabBadge = (tab: AdminToolsTab): number | null => {
    if (tab === "applications" && pendingApplicationCount > 0) return pendingApplicationCount;
    if (tab === "userAnnouncements" && activeUserAnnouncementCount > 0) {
      return activeUserAnnouncementCount;
    }
    if (tab === "globalAnnouncement" && globalAnnouncementActive) return 1;
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
                アカウントを選択して、停止・POP配置・トレード機能・ツイートテンプレートを編集します。
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
                          }${account.suspended ? " admin-account-list__select--suspended" : ""}`}
                          onClick={() => setSelectedProfileUsername(account.username)}
                          aria-pressed={isSelected}
                        >
                          <span className="admin-account-list__identity">
                            <span className="admin-account-list__name">
                              {accountHolderLabel(account)}
                            </span>
                            {account.displayName?.trim() &&
                              account.displayName.trim() !== account.username && (
                                <span className="admin-account-list__username">
                                  {account.username}
                                </span>
                              )}
                            {account.store?.trim() ? (
                              <span className="admin-account-list__username">
                                所属: {account.store.trim()}
                              </span>
                            ) : null}
                          </span>
                          <span className="admin-account-list__badges">
                            {account.isAdministrator && (
                              <span className="admin-badge admin-badge--admin">管理者</span>
                            )}
                            {account.suspended && (
                              <span className="admin-badge admin-badge--suspended">停止中</span>
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
              onSetSuspended={onSetAccountSuspended}
            />
          </div>
        </div>
      )}

      {activeTab === "globalAnnouncement" && (
        <div
          id="admin-panel-globalAnnouncement"
          role="tabpanel"
          aria-labelledby="admin-tab-globalAnnouncement"
          className="admin-tools__tab-panel"
        >
          <section className="admin-tools__card admin-tools__card--single">
            <h3 className="admin-tools__card-title">全体アナウンス</h3>
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
                    onClick={selectAllGlobalTargets}
                    disabled={loading || saving || allGlobalTargetsSelected}
                  >
                    すべて選択
                  </button>
                  <button
                    type="button"
                    className="admin-target-picker__link"
                    onClick={clearAllGlobalTargets}
                    disabled={loading || saving || selectedGlobalTargetCount === 0}
                  >
                    すべて解除
                  </button>
                </div>
              </div>
              <ul className="admin-target-picker__list" aria-label="全体アナウンス配信先アカウント">
                {accounts.map((account) => {
                  const checked = globalAnnouncementTargetsDraft.has(account.username);
                  return (
                    <li key={account.username}>
                      <label className="admin-target-picker__item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGlobalAnnouncementTarget(account.username)}
                          disabled={loading || saving}
                        />
                        <span className="admin-target-picker__name">
                          {accountHolderLabel(account)}
                          {account.displayName?.trim() &&
                            account.displayName.trim() !== account.username && (
                              <span className="admin-target-picker__username">
                                {" "}
                                ({account.username})
                              </span>
                            )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="admin-target-picker__meta" role="status">
                {allGlobalTargetsSelected
                  ? "全アカウントに配信"
                  : `${selectedGlobalTargetCount.toLocaleString("ja-JP")} 件のアカウントに配信`}
              </p>
            </div>

            {globalAnnouncementActive && (
              <p className="admin-tools__status admin-tools__status--inline" role="status">
                現在配信中
              </p>
            )}

            <AnnouncementLevelPicker
              name="global-announcement-level"
              value={globalAnnouncementLevelDraft}
              disabled={loading || saving}
              onChange={setGlobalAnnouncementLevelDraft}
            />

            <textarea
              className="admin-tools__textarea"
              value={globalAnnouncementDraft}
              onChange={(event) => setGlobalAnnouncementDraft(event.target.value)}
              rows={10}
              placeholder="全員向けのお知らせを入力"
              disabled={loading || saving}
            />

            {savedGlobalAnnouncement?.updatedAt && (
              <p className="admin-tools__updated">
                最終更新: {formatDateTime(new Date(savedGlobalAnnouncement.updatedAt))}
                {savedGlobalAnnouncement.updatedBy
                  ? `（${savedGlobalAnnouncement.updatedBy}）`
                  : ""}
              </p>
            )}

            <div className="admin-tools__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleSaveGlobalAnnouncement()}
                disabled={loading || saving}
              >
                {saving ? "保存中..." : "全体アナウンスを保存"}
              </button>
              <button
                type="button"
                className="btn btn--secondary admin-tools__delete-btn"
                onClick={() => void handleDeleteGlobalAnnouncement()}
                disabled={loading || saving || !canDeleteGlobalAnnouncement}
              >
                {saving ? "処理中..." : "全体アナウンスを削除"}
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "userAnnouncements" && (
        <div
          id="admin-panel-userAnnouncements"
          role="tabpanel"
          aria-labelledby="admin-tab-userAnnouncements"
          className="admin-tools__tab-panel"
        >
          <section className="admin-tools__card admin-tools__card--single">
            <h3 className="admin-tools__card-title">個別アナウンス</h3>
            <p className="admin-tools__hint">
              選択したアカウントだけに追加で表示されるお知らせです。全体アナウンスとは別に表示されます。
            </p>

            <div className="admin-target-picker">
              <div className="admin-target-picker__header">
                <p className="admin-target-picker__label">編集するアカウント</p>
              </div>
              <ul className="admin-target-picker__list" aria-label="個別アナウンス編集対象アカウント">
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
                        <span className="admin-target-picker__name">
                          {accountHolderLabel(account)}
                          {account.displayName?.trim() &&
                            account.displayName.trim() !== account.username && (
                              <span className="admin-target-picker__username">
                                {" "}
                                ({account.username})
                              </span>
                            )}
                        </span>
                        {isActive && (
                          <span className="admin-badge admin-badge--announcement">配信中</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="admin-target-picker__meta" role="status">
                {activeUserAnnouncementCount.toLocaleString("ja-JP")}{" "}
                件のアカウントに個別アナウンスを設定中
              </p>
            </div>

            <AnnouncementLevelPicker
              name="user-announcement-level"
              value={announcementLevelDraft}
              disabled={loading || saving || !selectedUsername}
              onChange={setAnnouncementLevelDraft}
            />

            <textarea
              className="admin-tools__textarea"
              value={announcementDraft}
              onChange={(event) => setAnnouncementDraft(event.target.value)}
              rows={10}
              placeholder={
                selectedUsername
                  ? `${selectedUsername} 向けの個別お知らせを入力`
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
                onClick={() => void handleSaveUserAnnouncement()}
                disabled={loading || saving || !selectedUsername}
              >
                {saving ? "保存中..." : "このアカウント向けに保存"}
              </button>
              <button
                type="button"
                className="btn btn--secondary admin-tools__delete-btn"
                onClick={() => void handleDeleteUserAnnouncement()}
                disabled={loading || saving || !selectedUsername || !canDeleteUserAnnouncement}
              >
                {saving ? "処理中..." : "このアカウント向けを削除"}
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "tweetHistory" && (
        <div
          id="admin-panel-tweetHistory"
          role="tabpanel"
          aria-labelledby="admin-tab-tweetHistory"
          className="admin-tools__tab-panel"
        >
          <section className="admin-tools__card admin-tools__card--single">
            <h3 className="admin-tools__card-title">店舗別ツイート履歴（X）</h3>
            <p className="admin-tools__hint">
              アカウントの所属店舗ごとに、買取情報ツイート履歴の参照先 X プロフィールを設定します。
              未設定・店舗不明の場合は既定の {HARERUYA_ANNEX_SCREEN_NAME} を使います。
              URL（例: https://x.com/hareruya2annex）または @screen_name で入力できます。
            </p>

            {loading ? (
              <p className="admin-tools__muted">読み込み中...</p>
            ) : tweetHistoryStoreOrder.length === 0 ? (
              <p className="admin-tools__muted">
                登録アカウントに所属店舗がありません。下の入力から店舗名を追加できます。
              </p>
            ) : (
              <ul className="admin-tweet-history-list">
                {tweetHistoryStoreOrder.map((store) => (
                  <li key={store} className="admin-tweet-history-list__row">
                    <label className="admin-tweet-history-list__store" htmlFor={`tweet-history-${store}`}>
                      {store}
                    </label>
                    <input
                      id={`tweet-history-${store}`}
                      className="admin-tools__input"
                      type="text"
                      value={tweetHistoryDraft[store] ?? ""}
                      onChange={(event) =>
                        setTweetHistoryDraft((prev) => ({
                          ...prev,
                          [store]: event.target.value,
                        }))
                      }
                      placeholder={`未設定 → @${HARERUYA_ANNEX_SCREEN_NAME}`}
                      disabled={loading || saving}
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="admin-tweet-history-add">
              <input
                className="admin-tools__input"
                type="text"
                value={newTweetHistoryStore}
                onChange={(event) => setNewTweetHistoryStore(event.target.value)}
                placeholder="店舗名を追加（例: 郡山店）"
                disabled={loading || saving}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTweetHistoryStore();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAddTweetHistoryStore}
                disabled={loading || saving || !newTweetHistoryStore.trim()}
              >
                店舗を追加
              </button>
            </div>

            <div className="admin-tools__actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void handleSaveTweetHistory()}
                disabled={loading || saving}
              >
                {saving ? "保存中..." : "ツイート履歴URLを保存"}
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
      )}

      {activeTab === "debugMemo" && (
        <div
          id="admin-panel-debugMemo"
          role="tabpanel"
          aria-labelledby="admin-tab-debugMemo"
          className="admin-tools__tab-panel"
        >
          <section className="admin-tools__card admin-tools__card--single">
            <h3 className="admin-tools__card-title">管理者用デバッグメモ</h3>
            <p className="admin-tools__hint">
              管理者のみが閲覧・編集できます。運用メモや調査メモに使えます。
            </p>
            <textarea
              className="admin-tools__textarea admin-tools__textarea--mono"
              value={debugMemoDraft}
              onChange={(event) => setDebugMemoDraft(event.target.value)}
              rows={18}
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
