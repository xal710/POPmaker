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
  onSave: (username: string, patch: {
    canUsePopPlacement: boolean;
    canUseTradeFeatures: boolean;
    tweetTemplateMode: TweetTemplateMode;
    tweetTemplateCustom: string | null;
  }) => Promise<boolean>;
}

export function AccountProfilePanel({ account, saving, onSave }: AccountProfilePanelProps) {
  const [canUsePopPlacement, setCanUsePopPlacement] = useState(false);
  const [canUseTradeFeatures, setCanUseTradeFeatures] = useState(false);
  const [tweetTemplateMode, setTweetTemplateMode] = useState<TweetTemplateMode>("auto");
  const [tweetTemplateCustom, setTweetTemplateCustom] = useState("");

  useEffect(() => {
    if (!account) return;
    setCanUsePopPlacement(account.canUsePopPlacementOnline);
    setCanUseTradeFeatures(account.canUseTradeFeatures);
    setTweetTemplateMode(account.tweetTemplateMode);
    setTweetTemplateCustom(account.tweetTemplateCustom ?? "");
  }, [account]);

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
      <section className="admin-tools__card admin-tools__card--wide">
        <h3 className="admin-tools__card-title">アカウント設定</h3>
        <p className="admin-tools__muted">左の一覧からアカウントを選択してください。</p>
      </section>
    );
  }

  const handleSave = async () => {
    await onSave(account.username, {
      canUsePopPlacement,
      canUseTradeFeatures,
      tweetTemplateMode,
      tweetTemplateCustom: tweetTemplateMode === "custom" ? tweetTemplateCustom : null,
    });
  };

  return (
    <section className="admin-tools__card admin-tools__card--wide admin-profile">
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
        </section>
      </div>
    </section>
  );
}
