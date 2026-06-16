import { useEffect, useState } from "react";

export interface CardImageData {
  imageUrl: string | null;
  productTitle: string | null;
  searchQuery: string | null;
  productId: string | null;
  cached: boolean;
}

type CardImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CardImageData }
  | { status: "error"; message: string };

export function useCardImage(cardName: string | null) {
  const [state, setState] = useState<CardImageState>({ status: "idle" });

  useEffect(() => {
    if (!cardName) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setState({ status: "loading" });

      try {
        const params = new URLSearchParams({ name: cardName });
        const response = await fetch(`/api/card-image?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${response.status}`);
        }

        const data = (await response.json()) as CardImageData;
        setState({ status: "success", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
        setState({ status: "error", message });
      }
    };

    void load();

    return () => controller.abort();
  }, [cardName]);

  return state;
}
