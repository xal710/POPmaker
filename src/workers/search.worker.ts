import type { ComparisonItem } from "../types";
import { prepareSearchIndex, rankSearchEntries } from "../utils/searchRank";

export type SearchWorkerRequest =
  | { type: "INDEX"; items: ComparisonItem[] }
  | { type: "SEARCH"; requestId: number; query: string };

export type SearchWorkerResponse =
  | { type: "INDEX_DONE" }
  | { type: "SEARCH_DONE"; requestId: number; results: ComparisonItem[] };

let preparedIndex: ReturnType<typeof prepareSearchIndex> | null = null;

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const message = event.data;

  if (message.type === "INDEX") {
    preparedIndex = prepareSearchIndex(message.items);
    const response: SearchWorkerResponse = { type: "INDEX_DONE" };
    self.postMessage(response);
    return;
  }

  if (message.type === "SEARCH") {
    const results = preparedIndex ? rankSearchEntries(preparedIndex, message.query) : [];
    const response: SearchWorkerResponse = {
      type: "SEARCH_DONE",
      requestId: message.requestId,
      results,
    };
    self.postMessage(response);
  }
};
