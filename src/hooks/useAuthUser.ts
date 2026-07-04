import { useEffect, useState } from "react";

export function useAuthUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [canUsePopPlacementOnline, setCanUsePopPlacementOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/auth/me?t=${Date.now()}`);
        if (!response.ok) return;

        const data = (await response.json()) as {
          username?: string;
          canUsePopPlacementOnline?: boolean;
        };
        if (!cancelled && typeof data.username === "string") {
          setUsername(data.username);
          setCanUsePopPlacementOnline(data.canUsePopPlacementOnline === true);
        }
      } catch {
        // ローカル版など認証なし環境ではデフォルトテンプレートを使う
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { username, canUsePopPlacementOnline };
}
