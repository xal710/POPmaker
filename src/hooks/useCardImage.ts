import { useEffect, useState } from "react";

import {
  getCardImageCacheEntry,
  loadCardImageData,
  type CardImageData,
} from "../utils/cardImageStore";

export type { CardImageData };

export type CardImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CardImageData }
  | { status: "error"; message: string };

function readState(cardName: string | null): CardImageState {
  if (!cardName) return { status: "idle" };

  const entry = getCardImageCacheEntry(cardName);
  if (entry?.status === "success") {
    return { status: "success", data: entry.data };
  }
  if (entry?.status === "error") {
    return { status: "error", message: entry.message };
  }
  if (entry?.status === "loading") {
    return { status: "loading" };
  }

  return { status: "idle" };
}

export function useCardImage(cardName: string | null): CardImageState {
  const [state, setState] = useState<CardImageState>(() => readState(cardName));

  useEffect(() => {
    if (!cardName) {
      setState({ status: "idle" });
      return;
    }

    const cached = readState(cardName);
    if (cached.status === "success" || cached.status === "error") {
      setState(cached);
      return;
    }

    setState({ status: "loading" });

    const controller = new AbortController();

    loadCardImageData(cardName)
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
  }, [cardName]);

  return state;
}
