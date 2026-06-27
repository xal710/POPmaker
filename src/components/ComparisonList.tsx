import { memo } from "react";
import type { ComparisonItem } from "../types";
import {
  COMPARISON_SORT_LABELS,
  getComparisonSortArrow,
  type ComparisonSortKey,
  type ComparisonSortState,
} from "../utils/comparisonSort";
import { ComparisonRow } from "./ComparisonRow";

const SORT_KEYS: ComparisonSortKey[] = ["cardrush", "hareruya2", "diff"];

interface ComparisonListProps {
  items: ComparisonItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort: ComparisonSortState;
  onSortChange: (key: ComparisonSortKey) => void;
  onSelect: (item: ComparisonItem) => void;
  onPageChange: (page: number) => void;
}

export const ComparisonList = memo(function ComparisonList({
  items,
  page,
  pageSize,
  totalCount,
  sort,
  onSortChange,
  onSelect,
  onPageChange,
}: ComparisonListProps) {
  if (totalCount === 0) {
    return (
      <div className="empty-state">
        <p>表示するデータがありません</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  const rankOffset = rangeStart - 1;

  return (
    <section className="comparison-list" aria-label="買取価格比較リスト">
      <div className="comparison-list__header">
        <span className="comparison-list__header-rank">順位</span>
        <div className="comparison-list__header-body">
          <span className="comparison-list__header-label">カード名 / 買取価格</span>
          <div className="comparison-list__sort" role="group" aria-label="並べ替え">
            {SORT_KEYS.map((key) => {
              const isActive = sort.key === key;
              const label = COMPARISON_SORT_LABELS[key];
              const arrow = getComparisonSortArrow(sort, key);
              const directionLabel = sort.direction === "desc" ? "降順" : "昇順";

              return (
                <button
                  key={key}
                  type="button"
                  className={`comparison-list__sort-btn${
                    isActive ? " comparison-list__sort-btn--active" : ""
                  }`}
                  onClick={() => onSortChange(key)}
                  aria-pressed={isActive}
                  aria-label={
                    isActive ? `${label}で${directionLabel}に並べ替え中` : `${label}で降順に並べ替え`
                  }
                >
                  {label}
                  {arrow}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="comparison-list__body">
        {items.map((item, index) => (
          <ComparisonRow
            key={item.id}
            item={item}
            rank={rankOffset + index + 1}
            onSelect={onSelect}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="comparison-list__pagination" aria-label="ページ送り">
          <p className="comparison-list__page-info">
            {rangeStart.toLocaleString("ja-JP")}〜{rangeEnd.toLocaleString("ja-JP")}件
            <span className="comparison-list__page-total">
              {" "}
              / 全{totalCount.toLocaleString("ja-JP")}件
            </span>
          </p>
          <div className="comparison-list__page-controls">
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              前へ
            </button>
            <span className="comparison-list__page-current">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              次へ
            </button>
          </div>
        </nav>
      )}
    </section>
  );
});
