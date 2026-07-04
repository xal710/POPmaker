import { useEffect, useState } from "react";

import {
  DEFAULT_ACCOUNT_TWEET_PROFILE,
  normalizeAccountTweetProfile,
  type AccountTweetProfile,
} from "../../shared/accountProfile";

export function useAuthUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [canUsePopPlacementOnline, setCanUsePopPlacementOnline] = useState(false);
  const [canUseTradeFeatures, setCanUseTradeFeatures] = useState(false);
  const [tweetProfile, setTweetProfile] = useState<AccountTweetProfile>(
    DEFAULT_ACCOUNT_TWEET_PROFILE,
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/auth/me?t=${Date.now()}`);
        if (!response.ok) return;

        const data = (await response.json()) as {
          username?: string;
          canUsePopPlacementOnline?: boolean;
          canUseTradeFeatures?: boolean;
          tweetProfile?: AccountTweetProfile;
        };
        if (!cancelled && typeof data.username === "string") {
          setUsername(data.username);
          setCanUsePopPlacementOnline(data.canUsePopPlacementOnline === true);
          setCanUseTradeFeatures(data.canUseTradeFeatures === true);
          setTweetProfile(normalizeAccountTweetProfile(data.tweetProfile));
        }
      } catch {
        // ローカル版など認証なし環境ではデフォルトテンプレートを使う
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { username, canUsePopPlacementOnline, canUseTradeFeatures, tweetProfile };
}
