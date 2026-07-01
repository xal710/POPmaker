import { useCallback, useEffect, useState } from "react";

const ADMIN_MODE_STORAGE_KEY = "pop_admin_mode";

export function useAdminMode(enabled: boolean) {
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAdminMode(false);
      return;
    }

    try {
      setAdminMode(window.localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === "1");
    } catch {
      setAdminMode(false);
    }
  }, [enabled]);

  const toggleAdminMode = useCallback(() => {
    setAdminMode((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(ADMIN_MODE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { adminMode, toggleAdminMode };
}
