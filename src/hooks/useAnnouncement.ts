import { useCallback, useEffect, useState } from "react";

import type { AdminAnnouncementResponse } from "../../shared/admin";

export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcement?t=${Date.now()}`);
      if (!response.ok) {
        setAnnouncement("");
        setUpdatedAt(null);
        return;
      }

      const data = (await response.json()) as AdminAnnouncementResponse;
      setAnnouncement(typeof data.announcement === "string" ? data.announcement : "");
      setUpdatedAt(typeof data.updatedAt === "string" ? data.updatedAt : null);
    } catch {
      setAnnouncement("");
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    announcement,
    updatedAt,
    loading,
    reload,
  };
}
