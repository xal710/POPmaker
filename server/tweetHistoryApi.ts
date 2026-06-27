import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { sendJson } from "./http";
import { fetchBuyInfoTweetHistory } from "./tweetHistory";

export function createTweetHistoryMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname !== "/api/tweet-history") {
      next();
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    try {
      const entries = await fetchBuyInfoTweetHistory();
      sendJson(res, 200, {
        source: "live",
        entries,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ツイート履歴の取得に失敗しました";
      sendJson(res, 502, { error: message });
    }
  };
}
