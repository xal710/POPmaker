import { useEffect, useId, useRef, useState } from "react";
import type { ComparisonItem } from "../types";
import { formatDiff, getDiffTone } from "../utils/format";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: ComparisonItem[];
  isSearching: boolean;
  isSearchPending?: boolean;
  resultCount: number;
  totalCount: number;
  onSelectItem: (item: ComparisonItem) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  suggestions,
  isSearching,
  isSearchPending = false,
  resultCount,
  totalCount,
  onSelectItem,
}: SearchBarProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const showSuggestions = isOpen && query.trim().length > 0 && suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, suggestions]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (item: ComparisonItem) => {
    onQueryChange(item.name);
    onSelectItem(item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitSearch = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitSearch();
      return;
    }

    if (!showSuggestions) {
      if (event.key === "Escape") {
        onQueryChange("");
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <section className="search-bar" ref={containerRef} aria-label="カード検索">
      <div className="search-bar__field">
        <label className="search-bar__label" htmlFor={inputId}>
          検索
        </label>
        <div className="search-bar__input-wrap">
          <form
            className="search-bar__form"
            onSubmit={(event) => {
              event.preventDefault();
              commitSearch();
            }}
          >
            <input
              ref={inputRef}
              id={inputId}
              className="search-bar__input"
              type="search"
              enterKeyHint="search"
              value={query}
              placeholder="カード名・型番・エキスパンション（例: リザードン, 003/032, M5, pikachu）"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls={showSuggestions ? listboxId : undefined}
              aria-activedescendant={
                showSuggestions && activeIndex >= 0
                  ? `${listboxId}-option-${activeIndex}`
                  : undefined
              }
              onChange={(event) => {
                onQueryChange(event.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
          </form>
          {query && (
            <button
              type="button"
              className="search-bar__clear"
              onClick={() => {
                onQueryChange("");
                setIsOpen(false);
              }}
              aria-label="検索をクリア"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isSearching && (
        <p className="search-bar__status" role="status">
          {isSearchPending ? (
            <>検索中...</>
          ) : (
            <>
              検索結果: <strong>{resultCount.toLocaleString("ja-JP")}</strong> 件
              <span className="search-bar__status-total"> / {totalCount.toLocaleString("ja-JP")} 件</span>
            </>
          )}
        </p>
      )}

      {showSuggestions && (
        <ul className="search-bar__suggestions" id={listboxId} role="listbox">
          {suggestions.map((item, index) => (
            <li key={item.id} role="presentation">
              <button
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`search-bar__suggestion${
                  index === activeIndex ? " search-bar__suggestion--active" : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(item)}
              >
                <span className="search-bar__suggestion-name">{item.name}</span>
                <span
                  className={`search-bar__suggestion-diff search-bar__suggestion-diff--${getDiffTone(item.diff)}`}
                >
                  差額 {formatDiff(item.diff)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
