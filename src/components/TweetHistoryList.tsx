import { useId, useMemo, useState } from "react";

import { formatDateTime } from "../utils/format";
import type { TweetHistorySource } from "../hooks/useTweetHistory";
import type { TweetHistoryEntry } from "../../shared/tweetHistoryParse";
import {
  buildTweetHistorySearchIndex,
  countTweetHistoryBySeries,
  filterTweetHistoryEntries,
  isTweetHistoryFilterActive,
  SERIES_OPTIONS,
  TWEET_SERIES_LABELS,
  type TweetSeriesFilter,
} from "../utils/tweetHistoryFilter";

interface TweetHistoryListProps {
  entries: TweetHistoryEntry[];
  source: TweetHistorySource;
  loading?: boolean;
  error?: string | null;
}

function formatDailyPostLabel(entry: TweetHistoryEntry): string {
  if (!entry.dailyIndex || !entry.dailyTotal) return "—";
  return `${entry.dailyIndex} / ${entry.dailyTotal}`;
}

export function TweetHistoryList({ entries, source, loading = false, error }: TweetHistoryListProps) {
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<TweetSeriesFilter>("all");

  const seriesCounts = useMemo(() => countTweetHistoryBySeries(entries), [entries]);
  const searchIndex = useMemo(() => buildTweetHistorySearchIndex(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterTweetHistoryEntries(entries, searchQuery, seriesFilter, searchIndex),
    [entries, searchQuery, seriesFilter, searchIndex],
  );
  const filterActive = isTweetHistoryFilterActive(searchQuery, seriesFilter);

  return (
    <section className="tweet-history" aria-labelledby="tweet-history-title">
      <div className="tweet-history__intro">
        <h2 id="tweet-history-title" className="tweet-history__title">
          POP投稿履歴
        </h2>
        {source === "mock" && (
          <p className="tweet-history__note">オフライン仮データ</p>
        )}
        {error && source === "mock" && (
          <p className="tweet-history__error" role="status">
            投稿の取得に失敗したため仮データを表示しています（{error}）
          </p>
        )}
      </div>

      {!loading && entries.length > 0 && (
        <div className="tweet-history__toolbar">
          <label className="tweet-history__search" htmlFor={searchId}>
            <span className="tweet-history__search-label">カード名で検索</span>
            <input
              id={searchId}
              className="tweet-history__search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="例: ピカチュウ, pikachu, SV2a, SAR"
              aria-label="カード名で検索"
            />
          </label>

          <div className="tweet-history__filters">
            <p className="tweet-history__filters-label">エキスパンション</p>
            <div className="series-filter__buttons" role="group" aria-label="エキスパンションで絞り込み">
              <button
                type="button"
                className={`series-filter__btn${
                  seriesFilter === "all" ? " series-filter__btn--active" : ""
                }`}
                onClick={() => setSeriesFilter("all")}
                aria-pressed={seriesFilter === "all"}
              >
                すべて
                <span className="series-filter__count">{entries.length.toLocaleString("ja-JP")}</span>
              </button>
              {SERIES_OPTIONS.map((series) => (
                <button
                  key={series}
                  type="button"
                  className={`series-filter__btn${
                    seriesFilter === series ? " series-filter__btn--active" : ""
                  }`}
                  onClick={() => setSeriesFilter(series)}
                  aria-pressed={seriesFilter === series}
                >
                  {TWEET_SERIES_LABELS[series]}
                  <span className="series-filter__count">
                    {seriesCounts[series].toLocaleString("ja-JP")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true" />
          <p>投稿履歴を取得しています...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>【買取情報】の投稿が見つかりません</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="empty-state">
          <p>条件に一致する投稿が見つかりません</p>
          <p className="empty-state__hint">検索キーワードやエキスパンションを変更してください。</p>
        </div>
      ) : (
        <div className="tweet-history__table-wrap">
          <table className="tweet-history__table">
            <thead>
              <tr>
                <th scope="col">投稿日時</th>
                <th scope="col" title="その日の投稿順 / その日の総投稿数（買取情報以外も含む）">
                  その日の投稿
                </th>
                <th scope="col">カード名</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="tweet-history__date">
                    {formatDateTime(new Date(entry.postedAt))}
                  </td>
                  <td className="tweet-history__daily">{formatDailyPostLabel(entry)}</td>
                  <td className="tweet-history__card">
                    <a
                      className="tweet-history__link"
                      href={entry.tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.cardName}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <p className="tweet-history__count" aria-live="polite">
          {filterActive ? (
            <>
              表示 <strong>{filteredEntries.length.toLocaleString("ja-JP")}</strong> 件 / 全{" "}
              <strong>{entries.length.toLocaleString("ja-JP")}</strong> 件
            </>
          ) : (
            <>
              全 <strong>{entries.length.toLocaleString("ja-JP")}</strong> 件
            </>
          )}
        </p>
      )}
    </section>
  );
}
