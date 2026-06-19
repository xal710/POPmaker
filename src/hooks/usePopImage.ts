import { useEffect, useRef, useState } from "react";

import type { ComparisonItem } from "../types";
import { formatPopCopyName, formatPopImageFilename, formatYen } from "../utils/format";
import { generatePopImage } from "../utils/popImage";

export type PopImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; blob: Blob; imageUrl: string; filename: string }
  | { status: "error"; message: string };

export function usePopImage(
  item: ComparisonItem | null,
  productTitle: string | null,
  cardImageUrl: string | null,
): PopImageState {
  const [state, setState] = useState<PopImageState>({ status: "idle" });
  const imageUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const lastItemIdRef = useRef<number | null>(null);
  const hasDisplayedRef = useRef(false);

  useEffect(() => {
    if (!item) {
      lastItemIdRef.current = null;
      hasDisplayedRef.current = false;
      setState({ status: "idle" });
      return;
    }

    if (lastItemIdRef.current !== item.id) {
      lastItemIdRef.current = item.id;
      hasDisplayedRef.current = false;
    }

    const generation = ++generationRef.current;
    const sourceName = productTitle ?? item.name;
    const cardName = formatPopCopyName(sourceName);
    const priceLabel = formatYen(item.hareruya2);
    const filename = formatPopImageFilename(sourceName);

    if (!hasDisplayedRef.current) {
      setState({ status: "loading" });
    }

    generatePopImage({
      cardName,
      priceLabel,
      cardImageUrl,
    })
      .then((blob) => {
        if (generation !== generationRef.current) return;

        if (imageUrlRef.current) {
          URL.revokeObjectURL(imageUrlRef.current);
        }

        const nextUrl = URL.createObjectURL(blob);
        imageUrlRef.current = nextUrl;
        hasDisplayedRef.current = true;
        setState({ status: "success", blob, imageUrl: nextUrl, filename });
      })
      .catch((error) => {
        if (generation !== generationRef.current) return;

        const message = error instanceof Error ? error.message : "POP画像の生成に失敗しました";
        setState({ status: "error", message });
      });

    return () => {
      generationRef.current += 1;
    };
  }, [item, productTitle, cardImageUrl]);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, []);

  return state;
}
