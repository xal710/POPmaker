const TWEET_INTENT_URL = "https://x.com/intent/tweet";

export function buildTweetIntentUrl(text: string): string {
  return `${TWEET_INTENT_URL}?text=${encodeURIComponent(text.trim())}`;
}

export interface OpenTwitterComposeResult {
  opened: boolean;
  imageCopied: boolean;
  error: string | null;
}

function openUrlInNewTab(url: string): boolean {
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (tab) return true;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

/**
 * 先に画像をクリップボードへコピーし、その後 X の投稿画面を開く。
 * タブを先に開くとフォーカスが移ってコピーが失敗するため、順序を厳守する。
 */
export async function openTwitterComposeTabAfterCopy(
  text: string,
  copyImage: () => Promise<void>,
): Promise<OpenTwitterComposeResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { opened: false, imageCopied: false, error: "ツイート文が空です" };
  }

  try {
    await copyImage();
  } catch (error) {
    return {
      opened: false,
      imageCopied: false,
      error: error instanceof Error ? error.message : "POP画像のコピーに失敗しました",
    };
  }

  const url = buildTweetIntentUrl(trimmed);
  if (!openUrlInNewTab(url)) {
    return {
      opened: false,
      imageCopied: true,
      error: "POP画像はコピー済みですが、Xの投稿画面を開けませんでした",
    };
  }

  return { opened: true, imageCopied: true, error: null };
}
