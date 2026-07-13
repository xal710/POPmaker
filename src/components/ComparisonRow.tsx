import { memo } from "react";

import type { ComparisonItem } from "../types";
import {
  computeHareruyaSellMinusCardrushBuy,
  computeHareruyaSellMinusCardrushSell,
  formatDiff,
  formatOptionalYen,
  getComparisonListCardName,
  getDiffTone,
} from "../utils/format";

interface ComparisonRowProps {
  item: ComparisonItem;
  rank: number;
  onSelect: (item: ComparisonItem) => void;
  showSellPrices?: boolean;
}

export const ComparisonRow = memo(function ComparisonRow({
  item,
  rank,
  onSelect,
  showSellPrices = false,
}: ComparisonRowProps) {
  const sellMinusBuy = computeHareruyaSellMinusCardrushBuy(item);
  const sellMinusSell = computeHareruyaSellMinusCardrushSell(item);

  return (
    <article className={`comparison-row${showSellPrices ? " comparison-row--with-sell" : ""}`}>
      <div className="comparison-row__rank">{rank}</div>
      <div className="comparison-row__body">
        <button
          type="button"
          className="comparison-row__name"
          onClick={() => onSelect(item)}
        >
          {getComparisonListCardName(item)}
          {!item.matched && <span className="comparison-row__badge">未比較</span>}
        </button>
        <div className="comparison-row__price-groups">
          <div className="comparison-row__price-group">
            <span className="comparison-row__price-group-label">買取</span>
            <div className="comparison-row__prices">
              <div className={`price-chip price-chip--rush${!item.matched ? " price-chip--muted" : ""}`}>
                <span className="price-chip__label">CR</span>
                <span className="price-chip__value">{formatOptionalYen(item.cardrush)}</span>
              </div>
              <div className="price-chip price-chip--hareruya">
                <span className="price-chip__label">H2</span>
                <span className="price-chip__value">{formatOptionalYen(item.hareruya2)}</span>
              </div>
              <div
                className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(item.diff)}${
                  !item.matched ? " price-chip--muted" : ""
                }`}
              >
                <span className="price-chip__label">差額</span>
                <span className="price-chip__value">{formatDiff(item.diff)}</span>
              </div>
            </div>
          </div>
          {showSellPrices && (
            <div className="comparison-row__price-group">
              <span className="comparison-row__price-group-label">販売</span>
              <div className="comparison-row__prices">
                <div className={`price-chip price-chip--rush-sell${!item.matched ? " price-chip--muted" : ""}`}>
                  <span className="price-chip__label">CR</span>
                  <span className="price-chip__value">{formatOptionalYen(item.cardrushSellPrice)}</span>
                </div>
                <div className="price-chip price-chip--hareruya-sell">
                  <span className="price-chip__label">H2</span>
                  <span className="price-chip__value">{formatOptionalYen(item.hareruyaSellPrice)}</span>
                </div>
                <div
                  className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(sellMinusSell)}${
                    !item.matched ? " price-chip--muted" : ""
                  }`}
                >
                  <span className="price-chip__label">販売差</span>
                  <span className="price-chip__value">{formatDiff(sellMinusSell)}</span>
                </div>
                <div
                  className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(sellMinusBuy)}${
                    !item.matched ? " price-chip--muted" : ""
                  }`}
                >
                  <span className="price-chip__label">仕入差</span>
                  <span className="price-chip__value">{formatDiff(sellMinusBuy)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});
