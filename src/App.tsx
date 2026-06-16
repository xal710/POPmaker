import { useCallback, useEffect, useMemo, useState } from "react";

import { ComparisonList } from "./components/ComparisonList";

import { FilterPanel, DEFAULT_PRICE_FILTER } from "./components/FilterPanel";

import { Header } from "./components/Header";

import { PopModal } from "./components/PopModal";

import { SearchBar } from "./components/SearchBar";

import { useCardSearch } from "./hooks/useCardSearch";

import { useComparisonData } from "./hooks/useComparisonData";

import { useDebouncedValue } from "./hooks/useDebouncedValue";

import type { ComparisonItem } from "./types";

import { applyPriceFilter, isPriceFilterActive } from "./utils/priceFilter";

import { filterBySeries, type SeriesFilter as SeriesFilterValue } from "./utils/series";

import "./App.css";

const LIST_PAGE_SIZE = 150;
const SEARCH_DEBOUNCE_MS = 300;



function App() {

  const { data, loading, refreshing, error, warning, progressMessage, lastFetchedAt, refresh } =

    useComparisonData();

  const [selectedItem, setSelectedItem] = useState<ComparisonItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const [listVisibleCount, setListVisibleCount] = useState(LIST_PAGE_SIZE);

  const [filterOpen, setFilterOpen] = useState(false);

  const [seriesFilter, setSeriesFilter] = useState<SeriesFilterValue>("all");

  const [priceFilter, setPriceFilter] = useState(DEFAULT_PRICE_FILTER);



  const items = data?.items ?? [];

  const filteredItems = useMemo(() => {

    const byPrice = applyPriceFilter(items, priceFilter);

    return filterBySeries(byPrice, seriesFilter);

  }, [items, priceFilter, seriesFilter]);



  const { results, suggestions, isSearching, resultCount, isSearchPending } = useCardSearch(

    filteredItems,

    debouncedSearchQuery,

  );

  const isQueryPending = searchQuery.trim() !== debouncedSearchQuery.trim();
  const listSource = results;

  useEffect(() => {
    setListVisibleCount(LIST_PAGE_SIZE);
  }, [debouncedSearchQuery, seriesFilter, priceFilter]);

  const listItems = useMemo(
    () => listSource.slice(0, listVisibleCount),
    [listSource, listVisibleCount],
  );

  const handleSelectItem = useCallback((item: ComparisonItem) => {
    setSelectedItem(item);
  }, []);

  const handleShowMore = useCallback(() => {
    setListVisibleCount((count) => count + LIST_PAGE_SIZE);
  }, []);



  const isSeriesFiltered = seriesFilter !== "all";

  const isPriceFiltered = isPriceFilterActive(priceFilter);

  const isListFiltered = isSearching || isSeriesFiltered || isPriceFiltered;

  const visibleCount = isSearching ? resultCount : filteredItems.length;



  const clearFilters = () => {

    setSeriesFilter("all");

    setPriceFilter(DEFAULT_PRICE_FILTER);

  };



  return (

    <div className="app">

      <Header

        itemCount={visibleCount}

        lastFetchedAt={lastFetchedAt}

        loading={loading}

        refreshing={refreshing}

        progressMessage={progressMessage}

        onRefresh={refresh}

        isFiltered={isListFiltered}

        dataDate={data?.dataDate}

      />



      <main className="app-main">

        {warning && (

          <div className="alert alert--warning" role="status">

            {warning}

          </div>

        )}



        {error && (

          <div className="alert alert--error" role="alert">

            {error}

          </div>

        )}



        {!loading || items.length > 0 ? (

          <>

            <SearchBar

              query={searchQuery}

              onQueryChange={setSearchQuery}

              suggestions={suggestions}

              isSearching={isSearching || isQueryPending || isSearchPending}
              isSearchPending={isQueryPending || isSearchPending}

              resultCount={resultCount}

              totalCount={filteredItems.length}

              onSelectItem={handleSelectItem}

            />

            <FilterPanel

              open={filterOpen}

              onToggle={() => setFilterOpen((value) => !value)}

              items={items}

              seriesFilter={seriesFilter}

              onSeriesFilterChange={setSeriesFilter}

              priceFilter={priceFilter}

              onPriceFilterChange={setPriceFilter}

              onClear={clearFilters}

              filteredCount={filteredItems.length}

            />

          </>

        ) : null}



        {loading && items.length === 0 ? (

          <div className="loading-state">

            <div className="loading-spinner" aria-hidden="true" />

            <p>データを読み込んでいます...</p>

          </div>

        ) : results.length === 0 && isSearching ? (

          <div className="empty-state">

            <p>「{searchQuery}」に一致するカードが見つかりません</p>

            <p className="empty-state__hint">

              記号を除いた型番（003032）やエキスパンション（M5）、ローマ字（pikachu）でも試せます

            </p>

          </div>

        ) : results.length === 0 && isListFiltered && !isSearching ? (

          <div className="empty-state">

            <p>絞り込み条件に一致するカードがありません</p>

            <p className="empty-state__hint">

              金額の上限・下限やシリーズを変更するか、「条件をクリア」でリセットしてください。

            </p>

          </div>

        ) : (

          <ComparisonList
            items={listItems}
            totalCount={listSource.length}
            onSelect={handleSelectItem}
            onShowMore={listItems.length < listSource.length ? handleShowMore : undefined}
          />

        )}

      </main>



      <PopModal item={selectedItem} onClose={() => setSelectedItem(null)} />

    </div>

  );

}



export default App;

