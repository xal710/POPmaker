import { useCallback, useEffect, useMemo, useState } from "react";

import { ComparisonList } from "./components/ComparisonList";

import { AdminToolsPanel } from "./components/AdminToolsPanel";
import { AnnouncementBanner } from "./components/AnnouncementBanner";

import { FilterPanel, DEFAULT_MATCH_FILTER, DEFAULT_PRICE_FILTER } from "./components/FilterPanel";

import { Header, type AppView } from "./components/Header";

import type { PendingPopPlacement } from "../shared/popPlacement";
import { PopModal } from "./components/PopModal";

import { PopPlacementView } from "./components/PopPlacementView";

import { TweetHistoryList } from "./components/TweetHistoryList";

import { SearchBar } from "./components/SearchBar";

import { useCardSearch } from "./hooks/useCardSearch";

import { useComparisonData } from "./hooks/useComparisonData";
import { useAdminMode } from "./hooks/useAdminMode";
import { useAdminPanel } from "./hooks/useAdminPanel";
import { useAnnouncement } from "./hooks/useAnnouncement";
import { useAuthUser } from "./hooks/useAuthUser";
import { usePopPlacementOnlineSync } from "./hooks/usePopPlacementOnlineSync";

import { useTweetHistory } from "./hooks/useTweetHistory";

import { useDebouncedValue } from "./hooks/useDebouncedValue";

import type { ComparisonItem } from "./types";

import {
  DEFAULT_COMPARISON_SORT,
  sortComparisonItems,
  toggleComparisonSort,
  type ComparisonSortKey,
  type ComparisonSortState,
} from "./utils/comparisonSort";
import { applyPriceFilter, isPriceFilterActive } from "./utils/priceFilter";
import { mergeComparisonItems } from "./utils/comparisonItems";
import { applyMatchFilter, isMatchFilterActive } from "./utils/matchFilter";
import {
  filterToOfficialBuyList,
} from "./utils/officialBuyListFilter";

import { filterBySeries, type SeriesFilter as SeriesFilterValue } from "./utils/series";

import { isAdministrator } from "../shared/admin";

import "./App.css";

const LIST_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

function App() {

  const { data, loading, refreshing, error, warning, progressMessage, lastFetchedAt, refresh } =

    useComparisonData();

  const { username } = useAuthUser();
  const isAdminUser = isAdministrator(username);
  const { adminMode, toggleAdminMode } = useAdminMode(isAdminUser);
  const {
    announcement,
    updatedAt: announcementUpdatedAt,
    reload: reloadAnnouncement,
  } = useAnnouncement();
  const adminPanel = useAdminPanel(isAdminUser && adminMode);
  usePopPlacementOnlineSync(username);

  const {
    entries: tweetHistoryEntries,
    loading: tweetHistoryLoading,
    error: tweetHistoryError,
  } = useTweetHistory();

  const [view, setView] = useState<AppView>("tool");

  const [selectedItem, setSelectedItem] = useState<ComparisonItem | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPopPlacement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const [listPage, setListPage] = useState(1);

  const [filterOpen, setFilterOpen] = useState(false);

  const [matchFilter, setMatchFilter] = useState(DEFAULT_MATCH_FILTER);
  const [internalComparisonMode, setInternalComparisonMode] = useState(false);

  const [seriesFilter, setSeriesFilter] = useState<SeriesFilterValue>("all");

  const [priceFilter, setPriceFilter] = useState(DEFAULT_PRICE_FILTER);
  const [sort, setSort] = useState<ComparisonSortState>(DEFAULT_COMPARISON_SORT);

  const allItems = useMemo(() => mergeComparisonItems(data), [data]);

  const catalogItems = useMemo(
    () => (internalComparisonMode ? allItems : filterToOfficialBuyList(allItems)),
    [allItems, internalComparisonMode],
  );

  const buyListCount = useMemo(() => filterToOfficialBuyList(allItems).length, [allItems]);

  const filteredItems = useMemo(() => {
    const byMatch = applyMatchFilter(catalogItems, matchFilter);
    const byPrice = applyPriceFilter(byMatch, priceFilter);
    return filterBySeries(byPrice, seriesFilter);
  }, [catalogItems, matchFilter, priceFilter, seriesFilter]);



  const { results, suggestions, isSearching, resultCount, isSearchPending } = useCardSearch(

    filteredItems,

    debouncedSearchQuery,

  );

  const isQueryPending = searchQuery.trim() !== debouncedSearchQuery.trim();
  const listSource = useMemo(() => sortComparisonItems(results, sort), [results, sort]);

  useEffect(() => {
    setListPage(1);
  }, [debouncedSearchQuery, matchFilter, internalComparisonMode, seriesFilter, priceFilter, sort]);

  const handleSortChange = useCallback((key: ComparisonSortKey) => {
    setSort((current) => toggleComparisonSort(current, key));
  }, []);

  const totalPages = Math.max(1, Math.ceil(listSource.length / LIST_PAGE_SIZE));
  const currentPage = Math.min(listPage, totalPages);

  const listItems = useMemo(() => {
    const start = (currentPage - 1) * LIST_PAGE_SIZE;
    return listSource.slice(start, start + LIST_PAGE_SIZE);
  }, [listSource, currentPage]);

  const handleSelectItem = useCallback((item: ComparisonItem) => {
    setSelectedItem(item);
  }, []);

  const handlePlacePop = useCallback((placement: PendingPopPlacement) => {
    setPendingPlacement(placement);
    setSelectedItem(null);
    setView("popPlacement");
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setListPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);



  const isMatchFiltered = isMatchFilterActive(matchFilter);

  const isSeriesFiltered = seriesFilter !== "all";

  const isPriceFiltered = isPriceFilterActive(priceFilter);

  const isListFiltered = isSearching || isMatchFiltered || isSeriesFiltered || isPriceFiltered;

  const visibleCount = isSearching ? resultCount : filteredItems.length;



  const clearFilters = () => {
    setInternalComparisonMode(false);
    setMatchFilter(DEFAULT_MATCH_FILTER);
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

        updatedAt={data?.updatedAt}

        dataSource={data?.source}

        hareruyaBuyListUpdatedAt={data?.hareruyaBuyListUpdatedAt}

        view={view}

        onNavigate={setView}

        isAdministrator={isAdminUser}

        adminMode={adminMode}

        onAdminModeToggle={toggleAdminMode}

        internalComparisonMode={internalComparisonMode}

      />



      <main className="app-main">

        <AnnouncementBanner announcement={announcement} updatedAt={announcementUpdatedAt} />

        {isAdminUser && adminMode && (
          <AdminToolsPanel
            accounts={adminPanel.accounts}
            settings={adminPanel.settings}
            loading={adminPanel.loading}
            saving={adminPanel.saving}
            error={adminPanel.error}
            onSaveAnnouncement={adminPanel.saveAnnouncement}
            onDeleteAnnouncement={adminPanel.deleteAnnouncement}
            onSaveDebugMemo={adminPanel.saveDebugMemo}
            onAnnouncementSaved={() => void reloadAnnouncement()}
          />
        )}

        {view === "tweetHistory" ? (

          <TweetHistoryList
            entries={tweetHistoryEntries}
            loading={tweetHistoryLoading}
            error={tweetHistoryError}
          />

        ) : view === "popPlacement" ? (

          <PopPlacementView
            comparisonItems={allItems}
            pendingPlacement={pendingPlacement}
            onPendingPlacementConsumed={() => setPendingPlacement(null)}
            onCancelPendingPlacement={() => setPendingPlacement(null)}
          />

        ) : (

          <>

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



        {!loading || allItems.length > 0 ? (

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
              items={catalogItems}
              internalComparisonMode={internalComparisonMode}
              onInternalComparisonModeChange={setInternalComparisonMode}
              allItemsCount={allItems.length}
              buyListCount={buyListCount}
              matchFilter={matchFilter}
              onMatchFilterChange={setMatchFilter}
              seriesFilter={seriesFilter}
              onSeriesFilterChange={setSeriesFilter}
              priceFilter={priceFilter}
              onPriceFilterChange={setPriceFilter}
              onClear={clearFilters}
              filteredCount={filteredItems.length}
            />

          </>

        ) : null}



        {loading && allItems.length === 0 ? (

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
              {matchFilter === "unmatched"
                ? "「最新価格を取得」でデータを更新するか、絞り込み条件を変更してください。"
                : "金額の上限・下限やシリーズを変更するか、「条件をクリア」でリセットしてください。"}
            </p>

          </div>

        ) : (

          <ComparisonList
            items={listItems}
            page={currentPage}
            pageSize={LIST_PAGE_SIZE}
            totalCount={listSource.length}
            sort={sort}
            onSortChange={handleSortChange}
            onSelect={handleSelectItem}
            onPageChange={handlePageChange}
          />

        )}

          </>

        )}

      </main>



      <PopModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPlacePop={handlePlacePop}
      />

    </div>

  );

}



export default App;

