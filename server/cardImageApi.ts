import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { fetchCardImage } from "./hareruya";
import { sendJson } from "./http";

export function createCardImageMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    if (!req.url?.startsWith("/api/card-image")) {
      next();
      return;
    }

    try {
      const url = new URL(req.url, "http://localhost");
      const cardName = url.searchParams.get("name");

      if (!cardName) {
        sendJson(res, 400, { error: "name パラメータが必要です" });
        return;
      }

      const result = await fetchCardImage(cardName);
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
      sendJson(res, 500, { error: message });
    }
  };
}
