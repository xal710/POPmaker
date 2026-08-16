import {
  normalizeAnnouncementLevel,
  type AnnouncementLevel,
} from "../../shared/admin";
import { formatDateTime } from "../utils/format";

interface AnnouncementEntry {
  text: string;
  updatedAt?: string | null;
  level?: AnnouncementLevel | null;
}

interface AnnouncementBannerProps {
  label?: string;
  announcement?: string;
  updatedAt?: string | null;
  level?: AnnouncementLevel | null;
  announcements?: AnnouncementEntry[];
}

export function AnnouncementBanner({
  label = "お知らせ",
  announcement = "",
  updatedAt = null,
  level = null,
  announcements,
}: AnnouncementBannerProps) {
  const entries = (announcements ?? [{ text: announcement, updatedAt, level }])
    .map((entry) => ({
      text: entry.text.trim(),
      updatedAt: entry.updatedAt ?? null,
      level: normalizeAnnouncementLevel(entry.level),
    }))
    .filter((entry) => entry.text);

  if (entries.length === 0) return null;

  return (
    <div className="announcement-stack">
      {entries.map((entry) => {
        const formattedUpdated = entry.updatedAt
          ? formatDateTime(new Date(entry.updatedAt))
          : null;

        return (
          <section
            key={`${entry.level}:${entry.text}`}
            className={`announcement-banner announcement-banner--${entry.level}`}
            role="status"
            aria-label={label}
          >
            <div className="announcement-banner__label">{label}</div>
            <div className="announcement-banner__body">
              <p className="announcement-banner__text">{entry.text}</p>
              {formattedUpdated && (
                <p className="announcement-banner__meta">更新: {formattedUpdated}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
