import { useEffect } from "react";

import { useCardImage } from "../hooks/useCardImage";
import type { ComparisonItem } from "../types";
import { getComparisonListCardName } from "../utils/format";
import { buildTradePriceSourceLinks } from "../../shared/priceSourceLinks";

interface TradeCardModalProps {
  item: ComparisonItem | null;
  onClose: () => void;
}

export function TradeCardModal({ item, onClose }: TradeCardModalProps) {
  const {
    state: cardImageState,
    refresh: refreshCardImage,
    refreshing: cardImageRefreshing,
  } = useCardImage(item?.name ?? null, { priority: "high" });

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const cardName = getComparisonListCardName(item);
  const links = buildTradePriceSourceLinks(item);
  const cardImageUrl =
    cardImageState.status === "success" ? cardImageState.data.imageUrl : null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--trade"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-modal-title"
      >
        <header className="modal__header">
          <h2 id="trade-modal-title">{cardName}</h2>
          <div className="modal__header-actions">
            <button
              type="button"
              className="btn btn--secondary btn--compact modal__refresh"
              onClick={() => void refreshCardImage()}
              disabled={cardImageRefreshing}
              aria-label="カード画像を更新"
            >
              {cardImageRefreshing ? "更新中..." : "画像更新"}
            </button>
            <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">
              ×
            </button>
          </div>
        </header>

        <div className="modal__content trade-modal__content">
          <div className="trade-modal__image-panel">
            {(cardImageState.status === "loading" ||
              cardImageState.status === "idle") && (
              <div className="pop-preview__image-placeholder pop-preview__image-placeholder--loading">
                <div className="loading-spinner" aria-hidden="true" />
                <span>晴れる屋2からカード画像を取得中...</span>
              </div>
            )}

            {cardImageState.status === "error" && (
              <div className="pop-preview__image-placeholder pop-preview__image-placeholder--error">
                <span>カード画像の取得に失敗しました</span>
                <small>{cardImageState.message}</small>
                <button
                  type="button"
                  className="btn btn--secondary btn--compact pop-preview__retry"
                  onClick={() => void refreshCardImage()}
                  disabled={cardImageRefreshing}
                >
                  {cardImageRefreshing ? "再試行中..." : "再試行"}
                </button>
              </div>
            )}

            {cardImageState.status === "success" && cardImageUrl && (
              <img
                className="trade-modal__image"
                src={cardImageUrl}
                alt={cardName}
              />
            )}

            {cardImageState.status === "success" && !cardImageUrl && (
              <div className="pop-preview__image-placeholder">
                <span>晴れる屋2に該当カード画像が見つかりませんでした</span>
              </div>
            )}
          </div>

          <div className="trade-modal__links">
            <section className="trade-modal__link-group">
              <h3 className="trade-modal__link-group-title">買取価格の掲載元</h3>
              <div className="trade-modal__link-list">
                <a
                  className="trade-modal__source-link"
                  href={links.hareruyaBuy}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="trade-modal__source-label">晴れる屋2</span>
                  <span className="trade-modal__source-value">買取リストを開く</span>
                </a>
                <a
                  className="trade-modal__source-link"
                  href={links.cardrushBuy}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="trade-modal__source-label">カードラッシュ</span>
                  <span className="trade-modal__source-value">買取リストを開く</span>
                </a>
              </div>
            </section>

            <section className="trade-modal__link-group">
              <h3 className="trade-modal__link-group-title">販売価格の掲載元</h3>
              <div className="trade-modal__link-list">
                {links.hareruyaSell ? (
                  <a
                    className="trade-modal__source-link"
                    href={links.hareruyaSell}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="trade-modal__source-label">晴れる屋2</span>
                    <span className="trade-modal__source-value">商品ページを開く</span>
                  </a>
                ) : (
                  <p className="trade-modal__source-unavailable">晴れる屋2: 商品ページURLなし</p>
                )}
                {links.cardrushSell ? (
                  <a
                    className="trade-modal__source-link"
                    href={links.cardrushSell}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="trade-modal__source-label">カードラッシュ</span>
                    <span className="trade-modal__source-value">商品ページを開く</span>
                  </a>
                ) : (
                  <p className="trade-modal__source-unavailable">カードラッシュ: 商品ページURLなし</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
