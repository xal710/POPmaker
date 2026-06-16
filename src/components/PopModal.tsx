import { useEffect, useMemo, useRef, useState } from "react";

import { useCardImage } from "../hooks/useCardImage";

import type { ComparisonItem } from "../types";

import { copyImageElement, copyImageFromUrl } from "../utils/clipboard";

import { buildTweetText, formatDiff, formatPopCopyName, formatYen } from "../utils/format";

import { countTweetCharacters, formatTweetCharCount, TWEET_MAX_LENGTH } from "../utils/tweetCount";



type CopyField = "name" | "price" | "tweet";



interface PopModalProps {

  item: ComparisonItem | null;

  onClose: () => void;

}



export function PopModal({ item, onClose }: PopModalProps) {

  const [copiedField, setCopiedField] = useState<CopyField | null>(null);

  const [tweetDraft, setTweetDraft] = useState("");

  const [imageCopied, setImageCopied] = useState(false);

  const [imageCopying, setImageCopying] = useState(false);

  const [imageCopyError, setImageCopyError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  const imageState = useCardImage(item?.name ?? null);

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

    setImageCopied(false);

    setImageCopying(false);

    setImageCopyError(null);

  }, [item]);



  const imageUrl =

    imageState.status === "success" ? imageState.data.imageUrl : null;

  const productTitle =

    imageState.status === "success" ? imageState.data.productTitle : null;



  useEffect(() => {

    if (!item) return;

    setTweetDraft(buildTweetText(item.name, item.hareruya2));

  }, [item, productTitle]);

  const tweetCharCount = useMemo(() => countTweetCharacters(tweetDraft), [tweetDraft]);
  const tweetCharCountLabel = useMemo(() => formatTweetCharCount(tweetCharCount), [tweetCharCount]);
  const isTweetOverLimit = tweetCharCount > TWEET_MAX_LENGTH;

  if (!item) return null;

  const copySourceName = productTitle ?? item.name;

  const popCopyName = formatPopCopyName(copySourceName);

  const popCopyPrice = formatYen(item.hareruya2);



  const handleCopyText = async (field: CopyField, text: string) => {

    try {

      await navigator.clipboard.writeText(text);

      setCopiedField(field);

      window.setTimeout(() => setCopiedField(null), 2000);

    } catch {

      setCopiedField(null);

    }

  };



  const handleCopyImage = async () => {

    if (!imageUrl) return;



    setImageCopying(true);

    setImageCopyError(null);



    try {

      const image = imageRef.current;

      if (image) {

        try {

          await copyImageElement(image);

        } catch {

          await copyImageFromUrl(imageUrl);

        }

      } else {

        await copyImageFromUrl(imageUrl);

      }



      setImageCopied(true);

      window.setTimeout(() => setImageCopied(false), 2000);

    } catch (error) {

      const message = error instanceof Error ? error.message : "画像のコピーに失敗しました";

      setImageCopyError(message);

    } finally {

      setImageCopying(false);

    }

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

          <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">

            ×

          </button>

        </header>



        <div className="modal__content">

          <div className="pop-preview">

            <div className="pop-preview__image-area">

              {imageState.status === "loading" && (

                <div className="pop-preview__image-placeholder pop-preview__image-placeholder--loading">

                  <div className="loading-spinner" aria-hidden="true" />

                  <span>画像を取得中...</span>

                </div>

              )}



              {imageState.status === "success" && imageUrl && (

                <div className="pop-preview__image-wrap">

                  <img

                    ref={imageRef}

                    className="pop-preview__image"

                    src={imageUrl}

                    alt={item.name}

                    crossOrigin="anonymous"

                    loading="lazy"

                  />

                  <button

                    type="button"

                    className="btn btn--secondary btn--compact"

                    onClick={handleCopyImage}

                    disabled={imageCopying}

                  >

                    {imageCopying

                      ? "コピー中..."

                      : imageCopied

                        ? "画像をコピーしました"

                        : "画像をコピー"}

                  </button>

                  {imageCopyError && (

                    <p className="pop-preview__image-error" role="alert">

                      {imageCopyError}

                    </p>

                  )}

                </div>

              )}

              {imageState.status === "success" && !imageUrl && (

                <div className="pop-preview__image-placeholder">

                  <span>画像が見つかりません</span>

                  <small>晴れる屋2の商品DBに該当カードがありません</small>

                </div>

              )}



              {imageState.status === "error" && (

                <div className="pop-preview__image-placeholder pop-preview__image-placeholder--error">

                  <span>画像の取得に失敗</span>

                  <small>{imageState.message}</small>

                </div>

              )}

            </div>



            <div className="pop-preview__card">

              <p className="pop-preview__name">{item.name}</p>

              {productTitle && productTitle !== item.name && (

                <p className="pop-preview__product-title">参照: {productTitle}</p>

              )}

              <div className="pop-preview__price-block">

                <div className="pop-preview__main-price">

                  <span className="pop-preview__price-label">晴れる屋2 買取</span>

                  <span className="pop-preview__price-value">{formatYen(item.hareruya2)}</span>

                </div>

                <div className="pop-preview__sub-prices">

                  <span>カードラッシュ {formatYen(item.cardrush)}</span>

                  <span className="pop-preview__diff">差額 {formatDiff(item.diff)}</span>

                </div>

              </div>

            </div>

          </div>



          <div className="pop-text-block">

            <h3>POP用テキスト</h3>

            <div className="pop-copy-row">

              <pre className="pop-text-block__text">{popCopyName}</pre>

              <button

                type="button"

                className="btn btn--secondary btn--compact"

                onClick={() => handleCopyText("name", popCopyName)}

              >

                {copiedField === "name" ? "コピーしました" : "カード名をコピー"}

              </button>

            </div>

            <div className="pop-copy-row">

              <pre className="pop-text-block__text">{popCopyPrice}</pre>

              <button

                type="button"

                className="btn btn--secondary btn--compact"

                onClick={() => handleCopyText("price", popCopyPrice)}

              >

                {copiedField === "price" ? "コピーしました" : "金額をコピー"}

              </button>

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


