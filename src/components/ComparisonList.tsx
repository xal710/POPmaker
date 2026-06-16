import type { ComparisonItem } from "../types";
import { ComparisonRow } from "./ComparisonRow";

interface ComparisonListProps {
  items: ComparisonItem[];
  onSelect: (item: ComparisonItem) => void;
}

export function ComparisonList({ items, onSelect }: ComparisonListProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>表示するデータがありません</p>
      </div>
    );
  }

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
    </section>
  );
}
