import { useCallback, useEffect, useState } from "react";

import type { AdminAnnouncementResponse, AnnouncementLevel } from "../../shared/admin";
import { DEFAULT_ANNOUNCEMENT_LEVEL, normalizeAnnouncementLevel } from "../../shared/admin";

export function useAnnouncement() {
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);
  const [globalAnnouncementLevel, setGlobalAnnouncementLevel] =
    useState<AnnouncementLevel>(DEFAULT_ANNOUNCEMENT_LEVEL);
  const [userAnnouncement, setUserAnnouncement] = useState("");
  const [userUpdatedAt, setUserUpdatedAt] = useState<string | null>(null);
  const [userAnnouncementLevel, setUserAnnouncementLevel] =
    useState<AnnouncementLevel>(DEFAULT_ANNOUNCEMENT_LEVEL);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcement?t=${Date.now()}`);
      if (!response.ok) {
        setGlobalAnnouncement("");
        setGlobalUpdatedAt(null);
        setGlobalAnnouncementLevel(DEFAULT_ANNOUNCEMENT_LEVEL);
        setUserAnnouncement("");
        setUserUpdatedAt(null);
        setUserAnnouncementLevel(DEFAULT_ANNOUNCEMENT_LEVEL);
        return;
      }

      const data = (await response.json()) as AdminAnnouncementResponse;
      setGlobalAnnouncement(
        typeof data.globalAnnouncement === "string" ? data.globalAnnouncement : "",
      );
      setGlobalUpdatedAt(
        typeof data.globalUpdatedAt === "string" ? data.globalUpdatedAt : null,
      );
      setGlobalAnnouncementLevel(normalizeAnnouncementLevel(data.globalAnnouncementLevel));
      setUserAnnouncement(typeof data.userAnnouncement === "string" ? data.userAnnouncement : "");
      setUserUpdatedAt(typeof data.userUpdatedAt === "string" ? data.userUpdatedAt : null);
      setUserAnnouncementLevel(normalizeAnnouncementLevel(data.userAnnouncementLevel));
    } catch {
      setGlobalAnnouncement("");
      setGlobalUpdatedAt(null);
      setGlobalAnnouncementLevel(DEFAULT_ANNOUNCEMENT_LEVEL);
      setUserAnnouncement("");
      setUserUpdatedAt(null);
      setUserAnnouncementLevel(DEFAULT_ANNOUNCEMENT_LEVEL);
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
    globalAnnouncementLevel,
    userAnnouncement,
    userUpdatedAt,
    userAnnouncementLevel,
    loading,
    reload,
  };
}
