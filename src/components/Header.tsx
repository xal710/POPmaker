import {
  formatBuyListDateMmDd,
  HARERUYA_BUY_LIST_PAGES,
} from "../../shared/hareruyaBuyListPages";
import { formatDateTime } from "../utils/format";

export type AppView = "tool" | "popPlacement" | "tweetHistory";

interface HeaderProps {
  itemCount: number;
  lastFetchedAt: Date | null;
  loading: boolean;
  refreshing: boolean;
  progressMessage?: string | null;
  onRefresh: () => void;
  isFiltered?: boolean;
  dataDate?: string | null;
  updatedAt?: string | null;
  dataSource?: "excel" | "json" | "web";
  hareruyaBuyListUpdatedAt?: Partial<Record<string, string>>;
  view?: AppView;
  onNavigate?: (view: AppView) => void;
  isAdministrator?: boolean;
  adminMode?: boolean;
  onAdminModeToggle?: () => void;
}

function formatDataDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length === 8) {
    return `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)}`;
  }
  return value;
}

function formatServerUpdatedDate(
  updatedAt: string | null | undefined,
  dataDate: string | null | undefined,
): string {
  if (updatedAt) {
    const date = new Date(updatedAt);
    if (!Number.isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}/${m}/${d}`;
    }
  }

  return formatDataDate(dataDate);
}

function updatedDateHint(source: HeaderProps["dataSource"]): string {
  if (source === "excel") {
    return "Excelの価格シート名に含まれる日付（例: 20260616_晴れる屋）";
  }
  return "サーバー上の比較データが最後に更新された日（「最新価格を取得」成功時）";
}

function getHeaderTitle(view: AppView): string {
  if (view === "popPlacement") return "POP配置登録";
  if (view === "tweetHistory") return "POP投稿履歴";
  return "買取価格比較 POP作成ツール";
}

export function Header({
  itemCount,
  lastFetchedAt,
  loading,
  refreshing,
  progressMessage,
  onRefresh,
  isFiltered = false,
  dataDate,
  updatedAt,
  dataSource,
  hareruyaBuyListUpdatedAt,
  view = "tool",
  onNavigate,
  isAdministrator = false,
  adminMode = false,
  onAdminModeToggle,
}: HeaderProps) {
  const busy = loading || refreshing;
  const isToolView = view === "tool";

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div>
          <p className="app-header__eyebrow">晴れる屋2 × カードラッシュ</p>
          <h1 className="app-header__title">{getHeaderTitle(view)}</h1>
        </div>
        <div className="app-header__actions">
          {isAdministrator && onAdminModeToggle && (
            <button
              type="button"
              className={`btn btn--secondary${adminMode ? " btn--admin-active" : ""}`}
              onClick={onAdminModeToggle}
              disabled={busy}
              aria-pressed={adminMode}
            >
              {adminMode ? "管理者モード ON" : "管理者モード"}
            </button>
          )}
          {onNavigate && isToolView && (
            <>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onNavigate("popPlacement")}
                disabled={busy}
              >
                POP配置
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onNavigate("tweetHistory")}
                disabled={busy}
              >
                ツイート履歴
              </button>
            </>
          )}
          {onNavigate && !isToolView && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onNavigate("tool")}
            >
              POP作成ツール
            </button>
          )}
          {isToolView && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onRefresh}
              disabled={busy}
            >
              {refreshing ? "更新中..." : "最新価格を取得"}
            </button>
          )}
        </div>
      </div>

      {isToolView && (
        <>
          {progressMessage && (
            <p className="app-header__progress" role="status">
              {progressMessage}
            </p>
          )}

          <div className="app-header__meta">
            <span className="meta-pill">
              {isFiltered ? "検索結果" : "件数"}: <strong>{itemCount.toLocaleString("ja-JP")}</strong> 件
            </span>
            <span className="meta-pill" title={updatedDateHint(dataSource)}>
              更新日: <strong>{formatServerUpdatedDate(updatedAt, dataDate)}</strong>
            </span>
            <span className="meta-pill" title="この端末が比較データを読み込んだ日時">
              読込: <strong>{lastFetchedAt ? formatDateTime(lastFetchedAt) : "—"}</strong>
            </span>
          </div>

          <div className="app-header__buylist-dates" aria-label="晴れる屋2 買取表の更新日">
            {HARERUYA_BUY_LIST_PAGES.map((page) => (
              <span
                key={page.slug}
                className="buylist-date-pill"
                title={`${page.title}（晴れる屋2 買取表）`}
              >
                <span className="buylist-date-pill__label">{page.label}</span>
                <span className="buylist-date-pill__value">
                  {formatBuyListDateMmDd(hareruyaBuyListUpdatedAt?.[page.slug])}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
