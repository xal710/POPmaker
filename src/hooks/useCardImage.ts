import { useCallback, useEffect, useRef, useState } from "react";

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

const MAX_LOAD_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  const generationRef = useRef(0);

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

    const generation = ++generationRef.current;
    setState({ status: "loading" });

    const targetName = cardName;
    async function load(attempt: number): Promise<void> {
      try {
        const data = await loadCardImageData(targetName, priority);
        if (generation !== generationRef.current) return;
        setState({ status: "success", data });
      } catch (error) {
        if (generation !== generationRef.current) return;

        if (attempt < MAX_LOAD_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          if (generation !== generationRef.current) return;
          await load(attempt + 1);
          return;
        }

        const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
        setState({ status: "error", message });
      }
    }

    void load(1);

    return () => {
      generationRef.current += 1;
    };
  }, [cardName, priority]);

  const refresh = useCallback(async () => {
    if (!cardName) return;

    const generation = ++generationRef.current;
    setRefreshing(true);
    setState({ status: "loading" });

    try {
      const data = await refreshCardImageData(cardName, priority);
      if (generation !== generationRef.current) return;
      setState({ status: "success", data });
    } catch (error) {
      if (generation !== generationRef.current) return;
      const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
      setState({ status: "error", message });
    } finally {
      if (generation === generationRef.current) {
        setRefreshing(false);
      }
    }
  }, [cardName, priority]);

  return { state, refresh, refreshing };
}
