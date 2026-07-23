import { memo, type ReactNode } from "react";

import type { ComparisonItem } from "../types";
import {
  computeHareruyaSellMinusCardrushBuy,
  computeHareruyaSellMinusCardrushSell,
  formatDiff,
  formatOptionalYen,
  getComparisonListCardName,
  getDiffTone,
} from "../utils/format";
import { buildTradePriceSourceLinks } from "../../shared/priceSourceLinks";

interface ComparisonRowProps {
  item: ComparisonItem;
  rank: number;
  onSelect: (item: ComparisonItem) => void;
  showSellPrices?: boolean;
  linkPriceSources?: boolean;
}

interface PriceChipProps {
  className: string;
  label: string;
  value: ReactNode;
  href?: string | null;
}

function PriceChip({ className, label, value, href }: PriceChipProps) {
  const content = (
    <>
      <span className="price-chip__label">{label}</span>
      <span className="price-chip__value">{value}</span>
    </>
  );

  if (href) {
    return (
      <a
        className={`${className} price-chip--link`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export const ComparisonRow = memo(function ComparisonRow({
  item,
  rank,
  onSelect,
  showSellPrices = false,
  linkPriceSources = false,
}: ComparisonRowProps) {
  const sellMinusBuy = computeHareruyaSellMinusCardrushBuy(item);
  const sellMinusSell = computeHareruyaSellMinusCardrushSell(item);
  const sourceLinks = linkPriceSources ? buildTradePriceSourceLinks(item) : null;

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
              <PriceChip
                className={`price-chip price-chip--rush${!item.matched ? " price-chip--muted" : ""}`}
                label="カードラッシュ"
                value={formatOptionalYen(item.cardrush)}
                href={sourceLinks?.cardrushBuy}
              />
              <PriceChip
                className="price-chip price-chip--hareruya"
                label="晴れる屋2"
                value={formatOptionalYen(item.hareruya2)}
                href={sourceLinks?.hareruyaBuy}
              />
              <PriceChip
                className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(item.diff)}${
                  !item.matched ? " price-chip--muted" : ""
                }`}
                label="差額"
                value={formatDiff(item.diff)}
              />
            </div>
          </div>
          {showSellPrices && (
            <div className="comparison-row__price-group">
              <span className="comparison-row__price-group-label">販売</span>
              <div className="comparison-row__prices">
                <PriceChip
                  className={`price-chip price-chip--rush-sell${!item.matched ? " price-chip--muted" : ""}`}
                  label="カードラッシュ"
                  value={formatOptionalYen(item.cardrushSellPrice)}
                  href={sourceLinks?.cardrushSell}
                />
                <PriceChip
                  className="price-chip price-chip--hareruya-sell"
                  label="晴れる屋2"
                  value={formatOptionalYen(item.hareruyaSellPrice)}
                  href={sourceLinks?.hareruyaSell}
                />
                <PriceChip
                  className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(sellMinusSell)}${
                    !item.matched ? " price-chip--muted" : ""
                  }`}
                  label="販売差"
                  value={formatDiff(sellMinusSell)}
                />
                <PriceChip
                  className={`price-chip price-chip--diff price-chip--diff-${getDiffTone(sellMinusBuy)}${
                    !item.matched ? " price-chip--muted" : ""
                  }`}
                  label="仕入差"
                  value={formatDiff(sellMinusBuy)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});
