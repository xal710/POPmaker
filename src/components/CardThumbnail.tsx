import { memo, useEffect, useRef, useState } from "react";

import { useCardImage } from "../hooks/useCardImage";
import { resolveCardImageProxyUrl } from "../utils/cardImageStore";

interface CardThumbnailProps {
  cardName: string;
}

export const CardThumbnail = memo(function CardThumbnail({ cardName }: CardThumbnailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const imageState = useCardImage(isVisible ? cardName : null);
  const proxyUrl =
    imageState.status === "success"
      ? resolveCardImageProxyUrl(imageState.data.imageUrl)
      : null;

  return (
    <div ref={rootRef} className="comparison-row__thumb" aria-hidden={!proxyUrl}>
      {proxyUrl ? (
        <img
          className="comparison-row__thumb-image"
          src={proxyUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="comparison-row__thumb-placeholder" />
      )}
    </div>
  );
});
