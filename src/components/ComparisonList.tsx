import { memo } from "react";
import type { ComparisonItem } from "../types";
import { ComparisonRow } from "./ComparisonRow";

interface ComparisonListProps {
  items: ComparisonItem[];
  totalCount: number;
  onSelect: (item: ComparisonItem) => void;
  onShowMore?: () => void;
}

export const ComparisonList = memo(function ComparisonList({
  items,
  totalCount,
  onSelect,
  onShowMore,
}: ComparisonListProps) {
  if (totalCount === 0) {
    return (
      <div className="empty-state">
        <p>表示するデータがありません</p>
      </div>
    );
  }

  const hiddenCount = totalCount - items.length;

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
            rank={index + 1}
            onSelect={onSelect}
          />
        ))}
      </div>
      {hiddenCount > 0 && onShowMore && (
        <div className="comparison-list__more">
          <button type="button" className="btn btn--secondary" onClick={onShowMore}>
            さらに表示（残り {hiddenCount.toLocaleString("ja-JP")} 件）
          </button>
        </div>
      )}
    </section>
  );
});
