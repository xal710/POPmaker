import { memo } from "react";
import type { ComparisonItem } from "../types";
import { ComparisonRow } from "./ComparisonRow";

interface ComparisonListProps {
  items: ComparisonItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  onSelect: (item: ComparisonItem) => void;
  onPageChange: (page: number) => void;
}

export const ComparisonList = memo(function ComparisonList({
  items,
  page,
  pageSize,
  totalCount,
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
        <span>順位</span>
        <span>カード名</span>
        <span>買取価格</span>
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
