import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import { isAdministrator, isAnnouncementVisibleToUser } from "../shared/admin";
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
      const username = requireAuthenticatedUser(req, res);
      if (!username) return;

      const settings = readAdminSettings();
      const visible = isAnnouncementVisibleToUser(settings, username);
      sendJson(res, 200, {
        announcement: visible ? settings.announcement : "",
        updatedAt: visible ? settings.updatedAt : null,
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
            announcementTargets?: unknown;
            debugMemo?: unknown;
          } | null;

          const patch: {
            announcement?: string;
            announcementTargets?: string[] | null;
            debugMemo?: string;
          } = {};

          const knownUsernames = new Set(
            listSiteAccountSummaries().map((account) => account.username),
          );

          if (body && "announcement" in body) {
            if (typeof body.announcement !== "string") {
              sendJson(res, 400, { error: "announcement は文字列で指定してください" });
              return;
            }
            patch.announcement = body.announcement;
          }

          if (body && "announcementTargets" in body) {
            const targets = body.announcementTargets;
            if (targets === null) {
              patch.announcementTargets = null;
            } else if (!Array.isArray(targets)) {
              sendJson(res, 400, { error: "announcementTargets は配列または null で指定してください" });
              return;
            } else if (!targets.every((entry) => typeof entry === "string")) {
              sendJson(res, 400, { error: "announcementTargets の要素は文字列で指定してください" });
              return;
            } else {
              const filtered = targets
                .map((entry) => entry.trim())
                .filter((entry) => entry && knownUsernames.has(entry));
              patch.announcementTargets =
                filtered.length === knownUsernames.size ? null : [...new Set(filtered)].sort();
            }
          }

          if (body && "debugMemo" in body) {
            if (typeof body.debugMemo !== "string") {
              sendJson(res, 400, { error: "debugMemo は文字列で指定してください" });
              return;
            }
            patch.debugMemo = body.debugMemo;
          }

          if (
            !("announcement" in patch) &&
            !("announcementTargets" in patch) &&
            !("debugMemo" in patch)
          ) {
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
