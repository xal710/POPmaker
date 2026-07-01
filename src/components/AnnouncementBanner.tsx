import { formatDateTime } from "../utils/format";

interface AnnouncementBannerProps {
  announcement: string;
  updatedAt: string | null;
}

export function AnnouncementBanner({ announcement, updatedAt }: AnnouncementBannerProps) {
  const trimmed = announcement.trim();
  if (!trimmed) return null;

  const updatedLabel = updatedAt ? formatDateTime(new Date(updatedAt)) : null;

  return (
    <section className="announcement-banner" role="status" aria-label="お知らせ">
      <div className="announcement-banner__label">お知らせ</div>
      <div className="announcement-banner__body">
        <p className="announcement-banner__text">{trimmed}</p>
        {updatedLabel && (
          <p className="announcement-banner__meta">更新: {updatedLabel}</p>
        )}
      </div>
    </section>
  );
}
