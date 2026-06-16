import { useEffect, useRef, useState } from "react";
import type { ComparisonItem } from "../types";
import type { SearchWorkerRequest, SearchWorkerResponse } from "../workers/search.worker";

const SUGGESTION_LIMIT = 8;

export function useCardSearch(items: ComparisonItem[], query: string) {
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const [results, setResults] = useState<ComparisonItem[]>(items);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [isRankPending, setIsRankPending] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const searchRequestRef = useRef(0);
  const pendingQueryRef = useRef<string>("");

  useEffect(() => {
    setResults(items);
  }, [items]);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/search.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
      const message = event.data;

      if (message.type === "INDEX_DONE") {
        setIsIndexReady(true);

        const pendingQuery = pendingQueryRef.current;
        if (pendingQuery && workerRef.current) {
          const requestId = ++searchRequestRef.current;
          setIsRankPending(true);
          workerRef.current.postMessage({
            type: "SEARCH",
            requestId,
            query: pendingQuery,
          } satisfies SearchWorkerRequest);
        }
        return;
      }

      if (message.type === "SEARCH_DONE") {
        if (message.requestId !== searchRequestRef.current) {
          return;
        }

        setResults(message.results);
        setIsRankPending(false);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setIsIndexReady(false);
    workerRef.current?.postMessage({ type: "INDEX", items } satisfies SearchWorkerRequest);
  }, [items]);

  useEffect(() => {
    pendingQueryRef.current = trimmedQuery;

    if (!trimmedQuery) {
      setResults(items);
      setIsRankPending(false);
      return;
    }

    if (!isIndexReady) {
      setIsRankPending(true);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setIsRankPending(true);
    workerRef.current?.postMessage({
      type: "SEARCH",
      requestId,
      query: trimmedQuery,
    } satisfies SearchWorkerRequest);
  }, [trimmedQuery, isIndexReady, items]);

  const suggestions = isSearching ? results.slice(0, SUGGESTION_LIMIT) : [];

  return {
    results: isSearching ? results : items,
    suggestions,
    isSearching,
    resultCount: isSearching ? results.length : items.length,
    isSearchPending: isSearching && (!isIndexReady || isRankPending),
  };
}
