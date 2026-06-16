import { useId, useMemo } from "react";
import type { ComparisonItem } from "../types";
import {
  countActivePriceFilters,
  DEFAULT_PRICE_FILTER,
  type DiffSignFilter,
  isPriceFilterActive,
  type PriceFilterState,
} from "../utils/priceFilter";
import {
  countBySeries,
  SERIES_LABELS,
  SERIES_OPTIONS,
  type SeriesFilter as SeriesFilterValue,
} from "../utils/series";

interface FilterPanelProps {
  open: boolean;
  onToggle: () => void;
  items: ComparisonItem[];
  seriesFilter: SeriesFilterValue;
  onSeriesFilterChange: (value: SeriesFilterValue) => void;
  priceFilter: PriceFilterState;
  onPriceFilterChange: (value: PriceFilterState) => void;
  onClear: () => void;
  filteredCount: number;
}

const DIFF_SIGN_OPTIONS: { value: DiffSignFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "positive", label: "差額＋のみ" },
  { value: "negative", label: "差額−のみ" },
];

function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minId,
  maxId,
  placeholder = "円",
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minId: string;
  maxId: string;
  placeholder?: string;
}) {
  return (
    <div className="price-filter__range">
      <p className="price-filter__range-label">{label}</p>
      <div className="price-filter__range-inputs">
        <label className="price-filter__field" htmlFor={minId}>
          <span>下限</span>
          <input
            id={minId}
            type="number"
            inputMode="numeric"
            min={0}
            value={minValue}
            placeholder={placeholder}
            onChange={(event) => onMinChange(event.target.value)}
          />
        </label>
        <label className="price-filter__field" htmlFor={maxId}>
          <span>上限</span>
          <input
            id={maxId}
            type="number"
            inputMode="numeric"
            min={0}
            value={maxValue}
            placeholder={placeholder}
            onChange={(event) => onMaxChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export function FilterPanel({
  open,
  onToggle,
  items,
  seriesFilter,
  onSeriesFilterChange,
  priceFilter,
  onPriceFilterChange,
  onClear,
  filteredCount,
}: FilterPanelProps) {
  const panelId = useId();
  const seriesCounts = useMemo(
    () => (open ? countBySeries(items) : null),
    [open, items],
  );
  const seriesActive = seriesFilter !== "all";
  const priceActive = isPriceFilterActive(priceFilter);
  const activeCount =
    (seriesActive ? 1 : 0) + countActivePriceFilters(priceFilter);

  const updatePrice = (patch: Partial<PriceFilterState>) => {
    onPriceFilterChange({ ...priceFilter, ...patch });
  };

  return (
    <section className="filter-section" aria-label="絞り込み">
      <button
        type="button"
        className={`filter-section__toggle${open ? " filter-section__toggle--open" : ""}${
          activeCount > 0 ? " filter-section__toggle--active" : ""
        }`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="filter-section__toggle-label">
          絞り込み
          {activeCount > 0 && (
            <span className="filter-section__badge">{activeCount}</span>
          )}
        </span>
        <span className="filter-section__toggle-meta">
          {open ? "閉じる" : "表示"}
          <span className="filter-section__chevron" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="filter-panel" id={panelId}>
          <div className="filter-panel__header">
            <p className="filter-panel__result" role="status">
              条件に一致: <strong>{filteredCount.toLocaleString("ja-JP")}</strong> 件
            </p>
            {activeCount > 0 && (
              <button type="button" className="btn btn--secondary btn--compact" onClick={onClear}>
                条件をクリア
              </button>
            )}
          </div>

          <div className="filter-panel__section">
            <h3 className="filter-panel__title">シリーズ</h3>
            <div className="series-filter__buttons" role="group" aria-label="シリーズで絞り込み">
              <button
                type="button"
                className={`series-filter__btn${
                  seriesFilter === "all" ? " series-filter__btn--active" : ""
                }`}
                onClick={() => onSeriesFilterChange("all")}
                aria-pressed={seriesFilter === "all"}
              >
                すべて
                <span className="series-filter__count">{items.length.toLocaleString("ja-JP")}</span>
              </button>
              {SERIES_OPTIONS.map((series) => (
                <button
                  key={series}
                  type="button"
                  className={`series-filter__btn${
                    seriesFilter === series ? " series-filter__btn--active" : ""
                  }`}
                  onClick={() => onSeriesFilterChange(series)}
                  aria-pressed={seriesFilter === series}
                >
                  {SERIES_LABELS[series]}
                  <span className="series-filter__count">
                    {(seriesCounts?.[series] ?? 0).toLocaleString("ja-JP")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-panel__section">
            <h3 className="filter-panel__title">価格・差額</h3>

            <div className="price-filter__sign" role="group" aria-label="差額の符号">
              {DIFF_SIGN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`series-filter__btn${
                    priceFilter.diffSign === option.value ? " series-filter__btn--active" : ""
                  }`}
                  onClick={() => updatePrice({ diffSign: option.value })}
                  aria-pressed={priceFilter.diffSign === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="price-filter__ranges">
              <RangeField
                label="差額（晴れる屋2 − カードラッシュ）"
                minId={`${panelId}-diff-min`}
                maxId={`${panelId}-diff-max`}
                minValue={priceFilter.diffMin}
                maxValue={priceFilter.diffMax}
                onMinChange={(diffMin) => updatePrice({ diffMin })}
                onMaxChange={(diffMax) => updatePrice({ diffMax })}
              />
              <RangeField
                label="晴れる屋2 買取価格"
                minId={`${panelId}-hareruya-min`}
                maxId={`${panelId}-hareruya-max`}
                minValue={priceFilter.hareruyaMin}
                maxValue={priceFilter.hareruyaMax}
                onMinChange={(hareruyaMin) => updatePrice({ hareruyaMin })}
                onMaxChange={(hareruyaMax) => updatePrice({ hareruyaMax })}
              />
              <RangeField
                label="カードラッシュ 買取価格"
                minId={`${panelId}-cardrush-min`}
                maxId={`${panelId}-cardrush-max`}
                minValue={priceFilter.cardrushMin}
                maxValue={priceFilter.cardrushMax}
                onMinChange={(cardrushMin) => updatePrice({ cardrushMin })}
                onMaxChange={(cardrushMax) => updatePrice({ cardrushMax })}
              />
            </div>

            {priceActive && (
              <p className="price-filter__hint">
                空欄の項目は制限なしとして扱います。差額は「＋のみ」「−のみ」と範囲を組み合わせられます。
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export { DEFAULT_PRICE_FILTER };
