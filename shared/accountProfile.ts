export type TweetTemplateId = "default" | "takadanobaba" | "koriyama" | "trade";

export type TweetTemplateMode = "auto" | TweetTemplateId | "custom";

export const TWEET_TEMPLATE_MODE_OPTIONS: Array<{
  value: TweetTemplateMode;
  label: string;
}> = [
  { value: "auto", label: "自動（店舗・機能から判定）" },
  { value: "default", label: "アネックス標準" },
  { value: "takadanobaba", label: "高田馬場店" },
  { value: "koriyama", label: "郡山店" },
  { value: "trade", label: "トレード機能" },
  { value: "custom", label: "カスタム文面" },
];

export interface AccountTweetProfile {
  tweetTemplateMode: TweetTemplateMode;
  tweetTemplateCustom: string | null;
}

export const DEFAULT_ACCOUNT_TWEET_PROFILE: AccountTweetProfile = {
  tweetTemplateMode: "auto",
  tweetTemplateCustom: null,
};

export const TWEET_TEMPLATE_PLACEHOLDER_HINT =
  "{cardName} = カード名、{price} = 価格（¥表記）";

export const TWEET_TEMPLATE_CUSTOM_EXAMPLE = `【買取情報】

「一言コメント」

{cardName}
{price}

店舗フッターやハッシュタグをここに書けます`;

export function isTweetTemplateMode(value: string): value is TweetTemplateMode {
  return TWEET_TEMPLATE_MODE_OPTIONS.some((option) => option.value === value);
}

export function normalizeAccountTweetProfile(
  profile: Partial<AccountTweetProfile> | null | undefined,
): AccountTweetProfile {
  const mode = profile?.tweetTemplateMode;
  return {
    tweetTemplateMode: mode && isTweetTemplateMode(mode) ? mode : "auto",
    tweetTemplateCustom:
      typeof profile?.tweetTemplateCustom === "string" ? profile.tweetTemplateCustom : null,
  };
}

export function resolveLegacyTweetTemplateId(
  username: string,
  canUseTradeFeatures: boolean,
): TweetTemplateId {
  if (canUseTradeFeatures) return "trade";
  if (username === "k.ishigaki") return "takadanobaba";
  if (username === "20260605") return "koriyama";
  return "default";
}

export function resolveAccountTweetTemplateId(
  username: string,
  canUseTradeFeatures: boolean,
  profile: AccountTweetProfile,
): TweetTemplateId | "custom" {
  if (profile.tweetTemplateMode === "auto") {
    return resolveLegacyTweetTemplateId(username, canUseTradeFeatures);
  }
  if (profile.tweetTemplateMode === "custom") {
    return "custom";
  }
  return profile.tweetTemplateMode;
}
