import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import { isAdministrator } from "../shared/admin";
import { getAuthenticatedUsername, listSiteAccountSummaries } from "./auth";
import { readAdminSettings, saveAdminSettings } from "./adminStore";
import { sendJson } from "./http";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return null;

  const text = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(text) as unknown;
}

function requireAuthenticatedUser(
  req: IncomingMessage,
  res: ServerResponse,
): string | null {
  const username = getAuthenticatedUsername(req);
  if (!username) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return username;
}

function requireAdministrator(
  req: IncomingMessage,
  res: ServerResponse,
): string | null {
  const username = requireAuthenticatedUser(req, res);
  if (!username) return null;

  if (!isAdministrator(username)) {
    sendJson(res, 403, { error: "管理者のみ利用できます" });
    return null;
  }

  return username;
}

export function createAdminMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/api/admin/announcement" && req.method === "GET") {
      if (!requireAuthenticatedUser(req, res)) return;

      const settings = readAdminSettings();
      sendJson(res, 200, {
        announcement: settings.announcement,
        updatedAt: settings.updatedAt,
      });
      return;
    }

    if (pathname === "/api/admin/settings") {
      if (req.method === "GET") {
        if (!requireAdministrator(req, res)) return;

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(),
        });
        return;
      }

      if (req.method === "PATCH") {
        const username = requireAdministrator(req, res);
        if (!username) return;

        try {
          const body = (await readJsonBody(req)) as {
            announcement?: unknown;
            debugMemo?: unknown;
          } | null;

          const patch: {
            announcement?: string;
            debugMemo?: string;
          } = {};

          if (body && "announcement" in body) {
            if (typeof body.announcement !== "string") {
              sendJson(res, 400, { error: "announcement は文字列で指定してください" });
              return;
            }
            patch.announcement = body.announcement;
          }

          if (body && "debugMemo" in body) {
            if (typeof body.debugMemo !== "string") {
              sendJson(res, 400, { error: "debugMemo は文字列で指定してください" });
              return;
            }
            patch.debugMemo = body.debugMemo;
          }

          if (!("announcement" in patch) && !("debugMemo" in patch)) {
            sendJson(res, 400, { error: "更新する項目を指定してください" });
            return;
          }

          const settings = saveAdminSettings(patch, username);
          sendJson(res, 200, {
            accounts: listSiteAccountSummaries(),
            settings,
          });
        } catch {
          sendJson(res, 400, { error: "リクエストが不正です" });
        }
        return;
      }

      sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    next();
  };
}
