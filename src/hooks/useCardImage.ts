import { useCallback, useEffect, useState } from "react";

import {
  getCardImageCacheEntry,
  loadCardImageData,
  refreshCardImageData,
  type CardImageData,
  type CardImagePriority,
} from "../utils/cardImageStore";

export type { CardImageData };

export type CardImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CardImageData }
  | { status: "error"; message: string };

interface UseCardImageOptions {
  priority?: CardImagePriority;
}

interface UseCardImageResult {
  state: CardImageState;
  refresh: () => Promise<void>;
  refreshing: boolean;
}

function readState(cardName: string | null): CardImageState {
  if (!cardName) return { status: "idle" };

  const entry = getCardImageCacheEntry(cardName);
  if (entry?.status === "success") {
    return { status: "success", data: entry.data };
  }
  if (entry?.status === "loading") {
    return { status: "loading" };
  }

  return { status: "idle" };
}

export function useCardImage(
  cardName: string | null,
  options: UseCardImageOptions = {},
): UseCardImageResult {
  const priority = options.priority ?? "normal";
  const [state, setState] = useState<CardImageState>(() => readState(cardName));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!cardName) {
      setState({ status: "idle" });
      return;
    }

    const cached = readState(cardName);
    if (cached.status === "success") {
      setState(cached);
      return;
    }

    setState({ status: "loading" });

    const controller = new AbortController();

    loadCardImageData(cardName, priority)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ status: "success", data });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, [cardName, priority]);

  const refresh = useCallback(async () => {
    if (!cardName) return;

    setRefreshing(true);
    setState({ status: "loading" });

    try {
      const data = await refreshCardImageData(cardName, priority);
      setState({ status: "success", data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
      setState({ status: "error", message });
    } finally {
      setRefreshing(false);
    }
  }, [cardName, priority]);

  return { state, refresh, refreshing };
}
