import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import { isAdministrator, getGlobalAnnouncementForUser, getUserAnnouncement, isAnnouncementLevel, normalizeAnnouncementTargets, type AnnouncementLevel } from "../shared/admin";
import { isTweetTemplateMode, type TweetTemplateMode } from "../shared/accountProfile";
import {
  approveAccountApplication,
  listAccountApplications,
  listStoredAccounts,
  rejectAccountApplication,
  setAccountPopPlacementAccess,
  setAccountSuspended,
  setAccountTradeFeaturesAccess,
  updateAccountProfile,
} from "./accountStore";
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

function getKnownUsernames(): string[] {
  return listStoredAccounts().map((account) => account.username);
}

export function createAdminMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/api/admin/announcement" && req.method === "GET") {
      const username = requireAuthenticatedUser(req, res);
      if (!username) return;

      const settings = readAdminSettings(getKnownUsernames());
      const globalEntry = getGlobalAnnouncementForUser(settings, username);
      const userEntry = getUserAnnouncement(settings, username);
      sendJson(res, 200, {
        globalAnnouncement: globalEntry?.text ?? "",
        globalUpdatedAt: globalEntry?.updatedAt ?? null,
        globalAnnouncementLevel: globalEntry?.level ?? "blue",
        userAnnouncement: userEntry?.text ?? "",
        userUpdatedAt: userEntry?.updatedAt ?? null,
        userAnnouncementLevel: userEntry?.level ?? "blue",
      });
      return;
    }

    if (pathname === "/api/admin/settings") {
      if (req.method === "GET") {
        if (!requireAdministrator(req, res)) return;

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(getKnownUsernames()),
          applications: listAccountApplications(),
        });
        return;
      }

      if (req.method === "PATCH") {
        const adminUsername = requireAdministrator(req, res);
        if (!adminUsername) return;

        try {
          const body = (await readJsonBody(req)) as {
            globalAnnouncement?: unknown;
            globalAnnouncementLevel?: unknown;
            globalAnnouncementTargets?: unknown;
            deleteGlobalAnnouncement?: unknown;
            userAnnouncement?: unknown;
            deleteUserAnnouncement?: unknown;
            debugMemo?: unknown;
            tweetHistoryByStore?: unknown;
          } | null;

          const knownUsernames = getKnownUsernames();
          const patch: {
            debugMemo?: string;
            globalAnnouncement?: string;
            globalAnnouncementLevel?: AnnouncementLevel;
            globalAnnouncementTargets?: string[] | null;
            deleteGlobalAnnouncement?: boolean;
            userAnnouncement?: {
              username: string;
              text: string;
              level?: AnnouncementLevel;
            };
            deleteUserAnnouncement?: string;
            tweetHistoryByStore?: Record<string, string>;
          } = {};

          if (body && "globalAnnouncement" in body) {
            if (typeof body.globalAnnouncement !== "string") {
              sendJson(res, 400, { error: "globalAnnouncement は文字列で指定してください" });
              return;
            }
            patch.globalAnnouncement = body.globalAnnouncement;
          }

          if (body && "globalAnnouncementLevel" in body) {
            if (!isAnnouncementLevel(body.globalAnnouncementLevel)) {
              sendJson(res, 400, { error: "globalAnnouncementLevel は blue / yellow / red で指定してください" });
              return;
            }
            patch.globalAnnouncementLevel = body.globalAnnouncementLevel;
          }

          if (body && "globalAnnouncementTargets" in body) {
            const value = body.globalAnnouncementTargets;
            if (value !== null && !Array.isArray(value)) {
              sendJson(res, 400, { error: "globalAnnouncementTargets の形式が不正です" });
              return;
            }

            if (value !== null && !value.every((entry) => typeof entry === "string")) {
              sendJson(res, 400, { error: "globalAnnouncementTargets は文字列配列で指定してください" });
              return;
            }

            patch.globalAnnouncementTargets =
              value === null
                ? null
                : normalizeAnnouncementTargets(value, knownUsernames);
          }

          if (body && "deleteGlobalAnnouncement" in body) {
            if (body.deleteGlobalAnnouncement !== true) {
              sendJson(res, 400, { error: "deleteGlobalAnnouncement は true で指定してください" });
              return;
            }
            patch.deleteGlobalAnnouncement = true;
          }

          if (body && "userAnnouncement" in body) {
            const value = body.userAnnouncement;
            if (!value || typeof value !== "object") {
              sendJson(res, 400, { error: "userAnnouncement の形式が不正です" });
              return;
            }

            const record = value as Record<string, unknown>;
            if (typeof record.username !== "string" || typeof record.text !== "string") {
              sendJson(res, 400, { error: "userAnnouncement には username と text が必要です" });
              return;
            }

            const username = record.username.trim();
            if (!knownUsernames.includes(username)) {
              sendJson(res, 400, { error: "指定したアカウントが見つかりません" });
              return;
            }

            if (record.level !== undefined && !isAnnouncementLevel(record.level)) {
              sendJson(res, 400, { error: "userAnnouncement.level は blue / yellow / red で指定してください" });
              return;
            }

            patch.userAnnouncement = {
              username,
              text: record.text,
              ...(record.level !== undefined ? { level: record.level } : {}),
            };
          }

          if (body && "deleteUserAnnouncement" in body) {
            if (typeof body.deleteUserAnnouncement !== "string") {
              sendJson(res, 400, { error: "deleteUserAnnouncement は文字列で指定してください" });
              return;
            }

            const username = body.deleteUserAnnouncement.trim();
            if (!knownUsernames.includes(username)) {
              sendJson(res, 400, { error: "指定したアカウントが見つかりません" });
              return;
            }

            patch.deleteUserAnnouncement = username;
          }

          if (body && "debugMemo" in body) {
            if (typeof body.debugMemo !== "string") {
              sendJson(res, 400, { error: "debugMemo は文字列で指定してください" });
              return;
            }
            patch.debugMemo = body.debugMemo;
          }

          if (body && "tweetHistoryByStore" in body) {
            const value = body.tweetHistoryByStore;
            if (!value || typeof value !== "object" || Array.isArray(value)) {
              sendJson(res, 400, { error: "tweetHistoryByStore の形式が不正です" });
              return;
            }

            const record = value as Record<string, unknown>;
            if (!Object.values(record).every((entry) => typeof entry === "string")) {
              sendJson(res, 400, { error: "tweetHistoryByStore は店舗名→URL（または @名）の文字列マップで指定してください" });
              return;
            }

            patch.tweetHistoryByStore = record as Record<string, string>;
          }

          if (
            !("globalAnnouncement" in patch) &&
            !("globalAnnouncementLevel" in patch) &&
            !("globalAnnouncementTargets" in patch) &&
            !("deleteGlobalAnnouncement" in patch) &&
            !("userAnnouncement" in patch) &&
            !("deleteUserAnnouncement" in patch) &&
            !("debugMemo" in patch) &&
            !("tweetHistoryByStore" in patch)
          ) {
            sendJson(res, 400, { error: "更新する項目を指定してください" });
            return;
          }

          const settings = saveAdminSettings(patch, knownUsernames, adminUsername);
          sendJson(res, 200, {
            accounts: listSiteAccountSummaries(),
            settings,
            applications: listAccountApplications(),
          });
        } catch (error) {
          if (error instanceof Error && error.message === "INVALID_ANNOUNCEMENT_USER") {
            sendJson(res, 400, { error: "指定したアカウントが見つかりません" });
            return;
          }
          sendJson(res, 400, { error: "リクエストが不正です" });
        }
        return;
      }

      sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    const applicationApproveMatch = pathname.match(
      /^\/api\/admin\/account-applications\/([^/]+)\/approve$/,
    );
    if (applicationApproveMatch && req.method === "POST") {
      const adminUsername = requireAdministrator(req, res);
      if (!adminUsername) return;

      try {
        const body = (await readJsonBody(req)) as {
          canUsePopPlacement?: unknown;
          canUseTradeFeatures?: unknown;
        } | null;
        const canUsePopPlacement = body?.canUsePopPlacement === true;
        const canUseTradeFeatures = body?.canUseTradeFeatures === true;
        const application = approveAccountApplication(applicationApproveMatch[1], adminUsername, {
          canUsePopPlacement,
          canUseTradeFeatures,
        });

        if (!application) {
          sendJson(res, 404, { error: "申請が見つからないか、承認できない状態です" });
          return;
        }

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          applications: listAccountApplications(),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "USERNAME_ALREADY_ACTIVE") {
          sendJson(res, 409, { error: "同じIDのアカウントが既に存在します" });
          return;
        }
        sendJson(res, 400, { error: "承認に失敗しました" });
      }
      return;
    }

    const applicationRejectMatch = pathname.match(
      /^\/api\/admin\/account-applications\/([^/]+)\/reject$/,
    );
    if (applicationRejectMatch && req.method === "POST") {
      const adminUsername = requireAdministrator(req, res);
      if (!adminUsername) return;

      const application = rejectAccountApplication(applicationRejectMatch[1], adminUsername);
      if (!application) {
        sendJson(res, 404, { error: "申請が見つからないか、却下できない状態です" });
        return;
      }

      sendJson(res, 200, {
        accounts: listSiteAccountSummaries(),
        applications: listAccountApplications(),
      });
      return;
    }

    if (pathname === "/api/admin/account-applications" && req.method === "GET") {
      if (!requireAdministrator(req, res)) return;

      sendJson(res, 200, {
        accounts: listSiteAccountSummaries(),
        settings: readAdminSettings(getKnownUsernames()),
        applications: listAccountApplications(),
      });
      return;
    }

    const popPlacementMatch = pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/pop-placement$/);
    if (popPlacementMatch && req.method === "PATCH") {
      if (!requireAdministrator(req, res)) return;

      try {
        const body = (await readJsonBody(req)) as { canUsePopPlacement?: unknown } | null;
        if (typeof body?.canUsePopPlacement !== "boolean") {
          sendJson(res, 400, { error: "canUsePopPlacement は boolean で指定してください" });
          return;
        }

        const username = decodeURIComponent(popPlacementMatch[1]);
        const account = setAccountPopPlacementAccess(username, body.canUsePopPlacement);
        if (!account) {
          sendJson(res, 404, { error: "アカウントが見つからないか、変更できません" });
          return;
        }

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(getKnownUsernames()),
          applications: listAccountApplications(),
        });
      } catch {
        sendJson(res, 400, { error: "更新に失敗しました" });
      }
      return;
    }

    const tradeFeaturesMatch = pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/trade-features$/);
    if (tradeFeaturesMatch && req.method === "PATCH") {
      if (!requireAdministrator(req, res)) return;

      try {
        const body = (await readJsonBody(req)) as { canUseTradeFeatures?: unknown } | null;
        if (typeof body?.canUseTradeFeatures !== "boolean") {
          sendJson(res, 400, { error: "canUseTradeFeatures は boolean で指定してください" });
          return;
        }

        const username = decodeURIComponent(tradeFeaturesMatch[1]);
        const account = setAccountTradeFeaturesAccess(username, body.canUseTradeFeatures);
        if (!account) {
          sendJson(res, 404, { error: "アカウントが見つからないか、変更できません" });
          return;
        }

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(getKnownUsernames()),
          applications: listAccountApplications(),
        });
      } catch {
        sendJson(res, 400, { error: "更新に失敗しました" });
      }
      return;
    }

    const suspendedMatch = pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/suspended$/);
    if (suspendedMatch && req.method === "PATCH") {
      const adminUsername = requireAdministrator(req, res);
      if (!adminUsername) return;

      try {
        const body = (await readJsonBody(req)) as { suspended?: unknown } | null;
        if (typeof body?.suspended !== "boolean") {
          sendJson(res, 400, { error: "suspended は boolean で指定してください" });
          return;
        }

        const username = decodeURIComponent(suspendedMatch[1]);
        if (isAdministrator(username)) {
          sendJson(res, 400, { error: "管理者アカウントは停止できません" });
          return;
        }

        const account = setAccountSuspended(username, body.suspended, adminUsername);
        if (!account) {
          sendJson(res, 404, { error: "アカウントが見つからないか、変更できません" });
          return;
        }

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(getKnownUsernames()),
          applications: listAccountApplications(),
        });
      } catch {
        sendJson(res, 400, { error: "更新に失敗しました" });
      }
      return;
    }

    const profileMatch = pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/profile$/);
    if (profileMatch && req.method === "PATCH") {
      if (!requireAdministrator(req, res)) return;

      try {
        const body = (await readJsonBody(req)) as {
          canUsePopPlacement?: unknown;
          canUseTradeFeatures?: unknown;
          tweetTemplateMode?: unknown;
          tweetTemplateCustom?: unknown;
        } | null;

        const username = decodeURIComponent(profileMatch[1]);
        const patch: {
          canUsePopPlacement?: boolean;
          canUseTradeFeatures?: boolean;
          tweetTemplateMode?: TweetTemplateMode;
          tweetTemplateCustom?: string | null;
        } = {};

        if (body && "canUsePopPlacement" in body) {
          if (typeof body.canUsePopPlacement !== "boolean") {
            sendJson(res, 400, { error: "canUsePopPlacement は boolean で指定してください" });
            return;
          }
          patch.canUsePopPlacement = body.canUsePopPlacement;
        }

        if (body && "canUseTradeFeatures" in body) {
          if (typeof body.canUseTradeFeatures !== "boolean") {
            sendJson(res, 400, { error: "canUseTradeFeatures は boolean で指定してください" });
            return;
          }
          patch.canUseTradeFeatures = body.canUseTradeFeatures;
        }

        if (body && "tweetTemplateMode" in body) {
          if (typeof body.tweetTemplateMode !== "string") {
            sendJson(res, 400, { error: "tweetTemplateMode は文字列で指定してください" });
            return;
          }
          if (!isTweetTemplateMode(body.tweetTemplateMode)) {
            sendJson(res, 400, { error: "tweetTemplateMode が不正です" });
            return;
          }
          patch.tweetTemplateMode = body.tweetTemplateMode;
        }

        if (body && "tweetTemplateCustom" in body) {
          if (body.tweetTemplateCustom !== null && typeof body.tweetTemplateCustom !== "string") {
            sendJson(res, 400, { error: "tweetTemplateCustom は文字列または null で指定してください" });
            return;
          }
          patch.tweetTemplateCustom = body.tweetTemplateCustom;
        }

        if (Object.keys(patch).length === 0) {
          sendJson(res, 400, { error: "更新する項目を指定してください" });
          return;
        }

        const account = updateAccountProfile(username, patch);
        if (!account) {
          sendJson(res, 404, { error: "アカウントが見つからないか、変更できません" });
          return;
        }

        sendJson(res, 200, {
          accounts: listSiteAccountSummaries(),
          settings: readAdminSettings(getKnownUsernames()),
          applications: listAccountApplications(),
        });
      } catch {
        sendJson(res, 400, { error: "更新に失敗しました" });
      }
      return;
    }

    next();
  };
}
