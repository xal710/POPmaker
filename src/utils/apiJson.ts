export async function readApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const trimmed = text.trim();

  if (
    contentType.includes("text/html") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html")
  ) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ログインの有効期限が切れています。ページを再読み込みしてログインし直してください。");
    }
    throw new Error(
      "サーバーからHTMLが返りました。デプロイ中か、再ログインが必要な状態です。ページを再読み込みしてください。",
    );
  }

  if (!trimmed) {
    throw new Error("サーバーから空の応答が返りました。");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error("サーバー応答の解析に失敗しました。ページを再読み込みしてください。");
  }
}
