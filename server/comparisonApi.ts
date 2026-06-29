import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { getAppVersion } from "./appVersion";
import { readComparisonFromJson } from "./excel";
import { sendJson } from "./http";
import { getRefreshProgress, refreshComparisonFromWeb } from "./refreshComparison";

export function createComparisonMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/api/comparison/status") {
      sendJson(res, 200, getRefreshProgress());
      return;
    }

    if (url.pathname === "/api/app-version" && req.method === "GET") {
      sendJson(res, 200, { version: getAppVersion() });
      return;
    }

    if (url.pathname === "/api/comparison/refresh" && req.method === "POST") {
      const current = getRefreshProgress();
      if (current.status === "running") {
        sendJson(res, 202, { progress: current });
        return;
      }

      void refreshComparisonFromWeb().catch(() => {
        // 進捗は getRefreshProgress で参照する
      });

      sendJson(res, 202, { progress: getRefreshProgress() });
      return;
    }

    if (url.pathname !== "/api/comparison") {
      next();
      return;
    }

    try {
      const payload = readComparisonFromJson();
      sendJson(res, 200, payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "比較データの取得に失敗しました";
      sendJson(res, 500, { error: message });
    }
  };
}
