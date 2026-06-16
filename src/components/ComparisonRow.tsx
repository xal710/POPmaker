import { memo } from "react";
import type { ComparisonItem } from "../types";
import { formatDiff, formatYen } from "../utils/format";

interface ComparisonRowProps {
  item: ComparisonItem;
  rank: number;
  onSelect: (item: ComparisonItem) => void;
}

export const ComparisonRow = memo(function ComparisonRow({
  item,
  rank,
  onSelect,
}: ComparisonRowProps) {
  return (
    <article className="comparison-row">
      <div className="comparison-row__rank">{rank}</div>
      <div className="comparison-row__body">
        <button
          type="button"
          className="comparison-row__name"
          onClick={() => onSelect(item)}
        >
          {item.name}
        </button>
        <div className="comparison-row__prices">
          <div className="price-chip price-chip--rush">
            <span className="price-chip__label">カードラッシュ</span>
            <span className="price-chip__value">{formatYen(item.cardrush)}</span>
          </div>
          <div className="price-chip price-chip--hareruya">
            <span className="price-chip__label">晴れる屋2</span>
            <span className="price-chip__value">{formatYen(item.hareruya2)}</span>
          </div>
          <div className="price-chip price-chip--diff">
            <span className="price-chip__label">差額</span>
            <span className="price-chip__value">{formatDiff(item.diff)}</span>
          </div>
        </div>
      </div>
    </article>
  );
});
