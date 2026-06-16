export const TWEET_MAX_LENGTH = 280;

function isHalfWidthChar(code: number): boolean {
  return (
    (code >= 0x20 && code <= 0x7e) ||
    (code >= 0xff61 && code <= 0xff9f)
  );
}

function weightForCodeUnit(code: number): number {
  if (code === 0x0d) return 0;
  if (code === 0x0a) return 0.5;
  if (code >= 0xff01 && code <= 0xff5e) return 1;
  return isHalfWidthChar(code) ? 0.5 : 1;
}

/**
 * X投稿画面に近い文字数カウント。
 * - 半角文字: 0.5
 * - 全角文字: 1
 * - 改行: 0.5（半角扱い）
 * - URL も半角として1文字ずつ加算
 */
export function countTweetCharacters(text: string): number {
  let total = 0;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code >= 0xd800 && code <= 0xdbff) {
      total += 1;
      index += 1;
      continue;
    }

    total += weightForCodeUnit(code);
  }

  return total;
}

export function formatTweetCharCount(count: number): string {
  return Number.isInteger(count) ? String(count) : count.toFixed(1);
}

export function isTweetWithinLimit(text: string): boolean {
  return countTweetCharacters(text) <= TWEET_MAX_LENGTH;
}
