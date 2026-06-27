import { useEffect, useState } from "react";

export function useAuthUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/auth/me?t=${Date.now()}`);
        if (!response.ok) return;

        const data = (await response.json()) as { username?: string };
        if (!cancelled && typeof data.username === "string") {
          setUsername(data.username);
        }
      } catch {
        // ローカル版など認証なし環境ではデフォルトテンプレートを使う
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { username };
}
