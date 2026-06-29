import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import {
  canUsePopPlacementOnline,
  POP_PLACEMENT_LAYOUT_VERSION,
  type PopPlacementAssignmentStore,
  type PopPlacementPayload,
} from "../shared/popPlacement";
import { getAuthenticatedUsername } from "./auth";
import { sendJson } from "./http";
import {
  readPopPlacementPayload,
  savePopPlacementAssignments,
} from "./popPlacementBackup";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return null;

  const text = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(text) as unknown;
}

function requireOnlinePopPlacementUser(
  req: IncomingMessage,
  res: ServerResponse,
): string | null {
  const username = getAuthenticatedUsername(req);
  if (!username) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }

  if (!canUsePopPlacementOnline(username)) {
    sendJson(res, 403, { error: "POP配置のオンライン同期は利用できません" });
    return null;
  }

  return username;
}

function isAssignmentStore(value: unknown): value is PopPlacementAssignmentStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  for (const wallAssignments of Object.values(value)) {
    if (!wallAssignments || typeof wallAssignments !== "object" || Array.isArray(wallAssignments)) {
      return false;
    }

    for (const assignment of Object.values(wallAssignments)) {
      if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) return false;
      const record = assignment as Record<string, unknown>;
      if (typeof record.cardName !== "string") return false;
      if (typeof record.sourceName !== "string") return false;
      if (typeof record.priceYen !== "number") return false;
      if (!(record.cardImageUrl === null || typeof record.cardImageUrl === "string")) return false;
    }
  }

  return true;
}

export function createPopPlacementMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname !== "/api/pop-placement") {
      next();
      return;
    }

    if (req.method === "GET") {
      const username = requireOnlinePopPlacementUser(req, res);
      if (!username) return;

      const payload = readPopPlacementPayload();
      sendJson(res, 200, payload satisfies PopPlacementPayload);
      return;
    }

    if (req.method === "PUT") {
      const username = requireOnlinePopPlacementUser(req, res);
      if (!username) return;

      try {
        const body = (await readJsonBody(req)) as {
          assignments?: unknown;
          layoutVersion?: unknown;
        } | null;

        if (body?.layoutVersion !== POP_PLACEMENT_LAYOUT_VERSION) {
          sendJson(res, 400, { error: "配置データの版が一致しません" });
          return;
        }

        if (!isAssignmentStore(body?.assignments)) {
          sendJson(res, 400, { error: "配置データの形式が不正です" });
          return;
        }

        const payload = savePopPlacementAssignments(body.assignments, username);
        sendJson(res, 200, payload);
      } catch {
        sendJson(res, 400, { error: "リクエストが不正です" });
      }
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  };
}
