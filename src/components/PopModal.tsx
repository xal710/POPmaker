import { useEffect, useMemo, useRef, useState } from "react";

import { useCardImage } from "../hooks/useCardImage";
import { usePopImage } from "../hooks/usePopImage";

import type { ComparisonItem } from "../types";

import { copyImageBlob, copyImageElement, downloadBlob } from "../utils/clipboard";
import { buildTweetText, formatHareruyaBuyListName } from "../utils/format";
import { countTweetCharacters, formatTweetCharCount, TWEET_MAX_LENGTH } from "../utils/tweetCount";

type CopyField = "pop" | "tweet" | "cardName";

interface PopModalProps {
  item: ComparisonItem | null;
  onClose: () => void;
}

export function PopModal({ item, onClose }: PopModalProps) {
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const [tweetDraft, setTweetDraft] = useState("");
  const [popCopying, setPopCopying] = useState(false);
  const [popCopyError, setPopCopyError] = useState<string | null>(null);
  const popImageRef = useRef<HTMLImageElement>(null);

  const {
    state: cardImageState,
    refresh: refreshCardImage,
    refreshing: cardImageRefreshing,
  } = useCardImage(item?.name ?? null, { priority: "high" });

  const cardImageReady = cardImageState.status === "success";
  const cardImageUrl =
    cardImageState.status === "success" ? cardImageState.data.imageUrl : null;
  const productTitle =
    cardImageState.status === "success" ? cardImageState.data.productTitle : null;

  const popImageState = usePopImage(item, productTitle, cardImageUrl, cardImageReady);

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

  useEffect(() => {
    setCopiedField(null);
    setTweetDraft("");
    setPopCopying(false);
    setPopCopyError(null);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const sourceName = productTitle ?? item.name;
    setTweetDraft(buildTweetText(sourceName, item.hareruya2));
  }, [item, productTitle]);

  const tweetCharCount = useMemo(() => countTweetCharacters(tweetDraft), [tweetDraft]);
  const tweetCharCountLabel = useMemo(() => formatTweetCharCount(tweetCharCount), [tweetCharCount]);
  const isTweetOverLimit = tweetCharCount > TWEET_MAX_LENGTH;
  const hareruyaBuyListName = useMemo(() => {
    if (!item) return "";
    return formatHareruyaBuyListName(productTitle ?? item.name);
  }, [item, productTitle]);

  if (!item) return null;

  const handleCopyText = async (field: CopyField, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setCopiedField(null);
    }
  };

  const handleCopyPopImage = async () => {
    if (popImageState.status !== "success") return;

    setPopCopying(true);
    setPopCopyError(null);

    try {
      const image = popImageRef.current;
      if (image) {
        try {
          await copyImageElement(image);
        } catch {
          await copyImageBlob(popImageState.blob);
        }
      } else {
        await copyImageBlob(popImageState.blob);
      }

      setCopiedField("pop");
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "POP画像のコピーに失敗しました";
      setPopCopyError(message);
    } finally {
      setPopCopying(false);
    }
  };

  const handleSavePopImage = () => {
    if (popImageState.status !== "success") return;
    downloadBlob(popImageState.blob, popImageState.filename);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pop-modal-title"
      >
        <header className="modal__header">
          <h2 id="pop-modal-title">POP作成プレビュー</h2>
          <div className="modal__header-actions">
            <button
              type="button"
              className="btn btn--secondary btn--compact modal__refresh"
              onClick={() => void refreshCardImage()}
              disabled={cardImageRefreshing}
              aria-label="カード画像を更新"
            >
              {cardImageRefreshing ? "更新中..." : "更新"}
            </button>
            <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">
              ×
            </button>
          </div>
        </header>

        <div className="modal__content">
          <div className="pop-preview">
            <div className="pop-preview__pop-area">
              <div className="pop-preview__pop-wrap">
                <div className="pop-preview__buylist-name-block">
                  <p className="pop-preview__buylist-name">{hareruyaBuyListName}</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--compact"
                    onClick={() => handleCopyText("cardName", hareruyaBuyListName)}
                  >
                    {copiedField === "cardName" ? "コピーしました" : "カード名をコピー"}
                  </button>
                </div>

              {(cardImageState.status === "loading" ||
                cardImageState.status === "idle" ||
                popImageState.status === "idle" ||
                popImageState.status === "loading") && (
                <div className="pop-preview__pop-placeholder pop-preview__pop-placeholder--loading">
                  <div className="loading-spinner" aria-hidden="true" />
                  <span>
                    {cardImageState.status !== "success"
                      ? "晴れる屋2からカード画像を取得中...（完了までお待ちください）"
                      : "POP画像を生成中..."}
                  </span>
                </div>
              )}

              {cardImageState.status === "error" && (
                <div className="pop-preview__pop-placeholder pop-preview__pop-placeholder--error">
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

              {cardImageState.status === "success" && popImageState.status === "success" && (
                <>
                  <img
                    ref={popImageRef}
                    className="pop-preview__pop-image"
                    src={popImageState.imageUrl}
                    alt={`${item.name}の買取POP`}
                  />
                  <div className="pop-preview__pop-actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--compact"
                      onClick={handleCopyPopImage}
                      disabled={popCopying}
                    >
                      {popCopying
                        ? "コピー中..."
                        : copiedField === "pop"
                          ? "コピーしました"
                          : "画像をコピー"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary btn--compact"
                      onClick={handleSavePopImage}
                    >
                      画像を保存
                    </button>
                  </div>
                  <p className="pop-preview__pop-filename">{popImageState.filename}</p>
                  {cardImageState.status === "success" && !cardImageUrl && (
                    <p className="pop-preview__image-error" role="status">
                      晴れる屋2に該当カード画像が見つからないため、「画像準備中」を表示しています。
                    </p>
                  )}
                  {popCopyError && (
                    <p className="pop-preview__image-error" role="alert">
                      {popCopyError}
                    </p>
                  )}
                </>
              )}

              {cardImageState.status === "success" && popImageState.status === "error" && (
                <div className="pop-preview__pop-placeholder pop-preview__pop-placeholder--error">
                  <span>POP画像の生成に失敗</span>
                  <small>{popImageState.message}</small>
                </div>
              )}
              </div>
            </div>
          </div>

          <div className="pop-text-block">
            <h3>ツイート用テキスト</h3>
            <textarea
              className="pop-text-block__textarea"
              value={tweetDraft}
              onChange={(event) => setTweetDraft(event.target.value)}
              rows={12}
              aria-label="ツイート用テキスト"
            />
            <div className="pop-text-block__tweet-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => handleCopyText("tweet", tweetDraft)}
              >
                {copiedField === "tweet" ? "コピーしました" : "ツイート文をコピー"}
              </button>
              <span
                className={`pop-text-block__char-count${isTweetOverLimit ? " pop-text-block__char-count--over" : ""}`}
                aria-live="polite"
              >
                {tweetCharCountLabel}
              </span>
            </div>
          </div>
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
