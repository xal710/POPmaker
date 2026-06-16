import { formatDateTime } from "../utils/format";

interface HeaderProps {
  itemCount: number;
  lastFetchedAt: Date | null;
  loading: boolean;
  refreshing: boolean;
  progressMessage?: string | null;
  onRefresh: () => void;
  isFiltered?: boolean;
  dataDate?: string | null;
}

function formatDataDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length === 8) {
    return `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)}`;
  }
  return value;
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
}: HeaderProps) {
  const busy = loading || refreshing;

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div>
          <p className="app-header__eyebrow">晴れる屋2 × カードラッシュ</p>
          <h1 className="app-header__title">買取価格比較 POP作成ツール</h1>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onRefresh}
          disabled={busy}
        >
          {refreshing ? "更新中..." : "最新価格を取得"}
        </button>
      </div>

      {progressMessage && (
        <p className="app-header__progress" role="status">
          {progressMessage}
        </p>
      )}

      <div className="app-header__meta">
        <span className="meta-pill">
          {isFiltered ? "検索結果" : "件数"}: <strong>{itemCount.toLocaleString("ja-JP")}</strong> 件
        </span>
        <span className="meta-pill">
          データ日: <strong>{formatDataDate(dataDate)}</strong>
        </span>
        <span className="meta-pill">
          読込: <strong>{lastFetchedAt ? formatDateTime(lastFetchedAt) : "—"}</strong>
        </span>
      </div>
    </header>
  );
}
