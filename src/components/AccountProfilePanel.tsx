import { useEffect, useMemo, useState } from "react";

import {
  TWEET_TEMPLATE_CUSTOM_EXAMPLE,
  TWEET_TEMPLATE_MODE_OPTIONS,
  TWEET_TEMPLATE_PLACEHOLDER_HINT,
  type TweetTemplateMode,
} from "../../shared/accountProfile";
import type { AdminAccountSummary } from "../../shared/admin";
import { buildTweetTextForAccount } from "../utils/format";

const PREVIEW_CARD_NAME = "ピカチュウ(P)[SV2a]";
const PREVIEW_PRICE = 1200;

interface AccountProfilePanelProps {
  account: AdminAccountSummary | null;
  saving: boolean;
  /** ツイート履歴タブに登録済みの店舗名 */
  storeOptions: string[];
  onSave: (username: string, patch: {
    canUsePopPlacement: boolean;
    canUseTradeFeatures: boolean;
    tweetTemplateMode: TweetTemplateMode;
    tweetTemplateCustom: string | null;
    store: string | null;
  }) => Promise<boolean>;
  onSetSuspended: (username: string, suspended: boolean) => Promise<boolean>;
}

export function AccountProfilePanel({
  account,
  saving,
  storeOptions,
  onSave,
  onSetSuspended,
}: AccountProfilePanelProps) {
  const [canUsePopPlacement, setCanUsePopPlacement] = useState(false);
  const [canUseTradeFeatures, setCanUseTradeFeatures] = useState(false);
  const [tweetTemplateMode, setTweetTemplateMode] = useState<TweetTemplateMode>("auto");
  const [tweetTemplateCustom, setTweetTemplateCustom] = useState("");
  const [store, setStore] = useState("");

  useEffect(() => {
    if (!account) return;
    setCanUsePopPlacement(account.canUsePopPlacementOnline);
    setCanUseTradeFeatures(account.canUseTradeFeatures);
    setTweetTemplateMode(account.tweetTemplateMode);
    setTweetTemplateCustom(account.tweetTemplateCustom ?? "");
    setStore(account.store?.trim() ?? "");
  }, [account]);

  const selectableStores = useMemo(() => {
    const names = new Set(storeOptions.map((name) => name.trim()).filter(Boolean));
    const current = store.trim();
    if (current) names.add(current);
    return [...names].sort((a, b) => a.localeCompare(b, "ja"));
  }, [store, storeOptions]);

  const storeNotInTweetHistory =
    Boolean(store.trim()) && !storeOptions.some((name) => name.trim() === store.trim());

  const previewText = useMemo(() => {
    if (!account) return "";
    return buildTweetTextForAccount(
      PREVIEW_CARD_NAME,
      PREVIEW_PRICE,
      account.username,
      canUseTradeFeatures,
      {
        tweetTemplateMode,
        tweetTemplateCustom: tweetTemplateMode === "custom" ? tweetTemplateCustom : null,
      },
    );
  }, [account, canUseTradeFeatures, tweetTemplateCustom, tweetTemplateMode]);

  if (!account) {
    return (
      <section className="admin-tools__card admin-profile">
        <h3 className="admin-tools__card-title">アカウント設定</h3>
        <p className="admin-tools__muted">左の一覧からアカウントを選択してください。</p>
      </section>
    );
  }

  const handleSave = async () => {
    const trimmedStore = store.trim();
    await onSave(account.username, {
      canUsePopPlacement,
      canUseTradeFeatures,
      tweetTemplateMode,
      tweetTemplateCustom: tweetTemplateMode === "custom" ? tweetTemplateCustom : null,
      store: trimmedStore || null,
    });
  };

  const handleToggleSuspended = async () => {
    if (account.isAdministrator) return;

    if (!account.suspended) {
      const confirmed = window.confirm(
        `${account.username} を停止しますか？停止中はログインできなくなります。`,
      );
      if (!confirmed) return;
    }

    await onSetSuspended(account.username, !account.suspended);
  };

  return (
    <section className="admin-tools__card admin-profile">
      <div className="admin-profile__header">
        <div>
          <h3 className="admin-tools__card-title">アカウント設定</h3>
          <p className="admin-tools__hint">
            {account.displayName ?? account.username}
            <span className="admin-application-list__meta"> ({account.username})</span>
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>

      <section className="admin-profile__section admin-profile__section--status">
        <h4 className="admin-profile__section-title">利用状態</h4>
        {account.isAdministrator ? (
          <p className="admin-tools__hint">管理者アカウントは停止できません。</p>
        ) : (
          <>
            <p className="admin-tools__hint">
              {account.suspended
                ? "このアカウントは停止中です。ログインできません。"
                : "停止すると、このアカウントはログインできなくなります。"}
            </p>
            <button
              type="button"
              className={`btn ${account.suspended ? "btn--secondary" : "btn--logout"}`}
              disabled={saving}
              onClick={() => void handleToggleSuspended()}
            >
              {saving
                ? "処理中..."
                : account.suspended
                  ? "停止を解除"
                  : "アカウントを停止"}
            </button>
          </>
        )}
      </section>

      <section className="admin-profile__section">
        <h4 className="admin-profile__section-title">所属店舗</h4>
        <p className="admin-tools__hint">
          「ツイート履歴」タブに登録した店舗から選択します。未選択の場合は既定アカウントを参照します。
        </p>
        {storeOptions.length === 0 ? (
          <p className="admin-tools__muted">
            先に「ツイート履歴」タブで店舗と X プロフィールを登録してください。
          </p>
        ) : null}
        <label className="admin-profile__field">
          <span className="admin-profile__label">店舗名</span>
          <select
            className="admin-profile__select"
            value={store}
            disabled={saving || (storeOptions.length === 0 && !store)}
            onChange={(event) => setStore(event.target.value)}
          >
            <option value="">未設定</option>
            {selectableStores.map((name) => (
              <option key={name} value={name}>
                {name}
                {storeOptions.some((option) => option.trim() === name)
                  ? ""
                  : "（ツイート履歴未登録）"}
              </option>
            ))}
          </select>
        </label>
        {storeNotInTweetHistory ? (
          <p className="admin-tools__hint">
            現在の所属店舗はツイート履歴に未登録です。別の店舗を選ぶか、ツイート履歴タブで登録してください。
          </p>
        ) : null}
      </section>

      <div className="admin-profile__grid">
        <section className="admin-profile__section">
          <h4 className="admin-profile__section-title">機能の割り当て</h4>
          <p className="admin-tools__hint">
            トレード機能とPOP配置は同時に利用できません。
          </p>
          <div className="admin-profile__toggles">
            <label className="admin-application-list__checkbox">
              <input
                type="checkbox"
                checked={canUsePopPlacement}
                disabled={saving || account.isAdministrator}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setCanUsePopPlacement(enabled);
                  if (enabled) setCanUseTradeFeatures(false);
                }}
              />
              POP配置
            </label>
            <label className="admin-application-list__checkbox">
              <input
                type="checkbox"
                checked={canUseTradeFeatures}
                disabled={saving}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setCanUseTradeFeatures(enabled);
                  if (enabled) setCanUsePopPlacement(false);
                }}
              />
              トレード機能
            </label>
          </div>
        </section>

        <section className="admin-profile__section">
          <h4 className="admin-profile__section-title">ツイートテンプレート</h4>
          {canUseTradeFeatures ? (
            <p className="admin-tools__hint">
              トレード機能ではツイートテンプレートは利用しません。
            </p>
          ) : (
            <>
              <label className="admin-profile__field">
                <span className="admin-profile__label">テンプレート</span>
                <select
                  className="admin-profile__select"
                  value={tweetTemplateMode}
                  disabled={saving}
                  onChange={(event) => setTweetTemplateMode(event.target.value as TweetTemplateMode)}
                >
                  {TWEET_TEMPLATE_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {tweetTemplateMode === "custom" && (
                <label className="admin-profile__field">
                  <span className="admin-profile__label">カスタム文面</span>
                  <textarea
                    className="admin-tools__textarea"
                    rows={10}
                    value={tweetTemplateCustom}
                    disabled={saving}
                    placeholder={TWEET_TEMPLATE_CUSTOM_EXAMPLE}
                    onChange={(event) => setTweetTemplateCustom(event.target.value)}
                  />
                  <span className="admin-tools__hint">{TWEET_TEMPLATE_PLACEHOLDER_HINT}</span>
                </label>
              )}

              <div className="admin-profile__preview">
                <p className="admin-profile__label">プレビュー</p>
                <pre className="admin-profile__preview-text">{previewText}</pre>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
