import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import { normalizeRegistrationInput } from "../shared/accountRegistration";
import {
  isDesiredUsernameTaken,
  submitAccountApplication,
} from "./accountStore";
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

export function createAccountRegistrationMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/api/auth/register/check" && req.method === "GET") {
      const username = url.searchParams.get("username") ?? "";
      sendJson(res, 200, {
        available: username.length > 0 ? !isDesiredUsernameTaken(username) : false,
      });
      return;
    }

    if (pathname === "/api/auth/register" && req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as Record<string, unknown> | null;
        const input = body ? normalizeRegistrationInput(body) : null;

        if (!input) {
          sendJson(res, 400, { error: "入力内容を確認してください" });
          return;
        }

        if (isDesiredUsernameTaken(input.desiredUsername)) {
          sendJson(res, 409, { error: "使用できません", code: "USERNAME_TAKEN" });
          return;
        }

        submitAccountApplication(input);
        sendJson(res, 201, { ok: true, message: "申請を受け付けました。管理者の承認後にログインできます。" });
      } catch (error) {
        if (error instanceof Error && error.message === "USERNAME_TAKEN") {
          sendJson(res, 409, { error: "使用できません", code: "USERNAME_TAKEN" });
          return;
        }
        sendJson(res, 400, { error: "申請の送信に失敗しました" });
      }
      return;
    }

    next();
  };
}
