import { useCallback, useEffect, useState } from "react";

import type { AdminAnnouncementResponse } from "../../shared/admin";

export function useAnnouncement() {
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);
  const [userAnnouncement, setUserAnnouncement] = useState("");
  const [userUpdatedAt, setUserUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcement?t=${Date.now()}`);
      if (!response.ok) {
        setGlobalAnnouncement("");
        setGlobalUpdatedAt(null);
        setUserAnnouncement("");
        setUserUpdatedAt(null);
        return;
      }

      const data = (await response.json()) as AdminAnnouncementResponse;
      setGlobalAnnouncement(
        typeof data.globalAnnouncement === "string" ? data.globalAnnouncement : "",
      );
      setGlobalUpdatedAt(
        typeof data.globalUpdatedAt === "string" ? data.globalUpdatedAt : null,
      );
      setUserAnnouncement(typeof data.userAnnouncement === "string" ? data.userAnnouncement : "");
      setUserUpdatedAt(typeof data.userUpdatedAt === "string" ? data.userUpdatedAt : null);
    } catch {
      setGlobalAnnouncement("");
      setGlobalUpdatedAt(null);
      setUserAnnouncement("");
      setUserUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    globalAnnouncement,
    globalUpdatedAt,
    userAnnouncement,
    userUpdatedAt,
    loading,
    reload,
  };
}
