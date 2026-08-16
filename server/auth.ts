import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { sendJson } from "./http";
import { ADMIN_USERNAME, type AdminAccountSummary } from "../shared/admin";
import { normalizeAccountTweetProfile } from "../shared/accountProfile";
import {
  accountCanUsePopPlacement,
  accountCanUseTradeFeatures,
  ensureAccountStoreFile,
  findApplicationByUsername,
  findAccountByUsername,
  listStoredAccounts,
  verifyAccountCredentials,
} from "./accountStore";
import { LOGIN_PAGE_HTML, REGISTER_PAGE_HTML } from "./authPages";

const AUTH_COOKIE = "pop_auth";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** 変更すると既存のログイン Cookie がすべて無効になります */
const AUTH_VERSION = process.env.AUTH_VERSION ?? "2";

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/register/check",
]);

function isPublicApiPath(pathname: string, method: string): boolean {
  if (pathname === "/api/auth/login" && method === "POST") return true;
  if (pathname === "/api/auth/logout" && method === "POST") return true;
  if (pathname === "/api/auth/register" && method === "POST") return true;
  if (pathname === "/api/auth/register/check" && method === "GET") return true;
  return PUBLIC_API_PATHS.has(pathname);
}

export function listSiteAccountSummaries(): AdminAccountSummary[] {
  return listStoredAccounts().map((account) => {
    const tweetProfile = normalizeAccountTweetProfile(account);
    return {
      username: account.username,
      displayName: account.displayName,
      isAdministrator: account.username === ADMIN_USERNAME,
      canUsePopPlacementOnline: account.canUsePopPlacement,
      canUseTradeFeatures: account.canUseTradeFeatures,
      tweetTemplateMode: tweetProfile.tweetTemplateMode,
      tweetTemplateCustom: tweetProfile.tweetTemplateCustom,
    };
  });
}

export function getAccountTweetProfileForUser(username: string) {
  const account = findAccountByUsername(username);
  if (!account) return normalizeAccountTweetProfile(null);
  return normalizeAccountTweetProfile(account);
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  try {
    return timingSafeEqual(Buffer.from(left), Buffer.from(right));
  } catch {
    return false;
  }
}

function createAuthToken(username: string): string {
  return createHash("sha256")
    .update(`${username}:${AUTH_VERSION}:pop-kaitori-tool`)
    .digest("hex");
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const result: Record<string, string> = {};
  const header = req.headers.cookie;
  if (!header) return result;

  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = decodeURIComponent(rest.join("="));
  }

  return result;
}

function isSecureRequest(req: IncomingMessage): boolean {
  return req.headers["x-forwarded-proto"] === "https";
}

function setAuthCookie(res: ServerResponse, req: IncomingMessage, username: string): void {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  const token = createAuthToken(username);
  res.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}${secure}`,
  );
}

function clearAuthCookie(res: ServerResponse, req: IncomingMessage): void {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

export function getAuthenticatedUsername(req: IncomingMessage): string | null {
  const token = parseCookies(req)[AUTH_COOKIE];
  if (!token) return null;

  for (const account of listStoredAccounts()) {
    const expected = createAuthToken(account.username);
    if (token.length !== expected.length) continue;
    if (safeEqual(token, expected)) return account.username;
  }

  return null;
}

function resolveLoginError(username: string, password: string): string {
  const trimmedUsername = username.trim();
  const account = verifyAccountCredentials(trimmedUsername, password);
  if (account) return "";

  const application = findApplicationByUsername(trimmedUsername);
  if (application?.status === "pending") {
    return "承認待ちです。管理者の許可後にログインできます。";
  }
  if (application?.status === "rejected") {
    return "申請は却下されています。管理者にお問い合わせください。";
  }

  return "アカウント名またはパスワードが正しくありません";
}

function verifyCredentials(username: string, password: string): string | null {
  const trimmedUsername = username.trim();
  if (!trimmedUsername || !password) return null;

  const account = verifyAccountCredentials(trimmedUsername, password);
  return account ? account.username : null;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve());
    req.on("error", reject);
  });

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return null;

  return JSON.parse(text) as unknown;
}

function wantsHtmlDocument(req: IncomingMessage, pathname: string): boolean {
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) return true;

  return pathname === "/" || pathname.endsWith(".html") || !pathname.includes(".");
}

function sendLoginPage(res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(LOGIN_PAGE_HTML);
}

function sendRegisterPage(res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(REGISTER_PAGE_HTML);
}

export function createAuthMiddleware(): Connect.NextHandleFunction {
  ensureAccountStoreFile();

  return async (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;
    const method = req.method ?? "GET";

    if (pathname === "/register" && method === "GET") {
      sendRegisterPage(res);
      return;
    }

    if (isPublicApiPath(pathname, method)) {
      if (pathname === "/api/auth/login" && method === "POST") {
        try {
          const body = (await readJsonBody(req)) as { username?: string; password?: string } | null;
          const username = typeof body?.username === "string" ? body.username : "";
          const password = typeof body?.password === "string" ? body.password : "";
          const authenticatedUsername = verifyCredentials(username, password);

          if (!authenticatedUsername) {
            sendJson(res, 401, { error: resolveLoginError(username, password) });
            return;
          }

          setAuthCookie(res, req, authenticatedUsername);
          sendJson(res, 200, { ok: true });
        } catch {
          sendJson(res, 400, { error: "リクエストが不正です" });
        }
        return;
      }

      if (pathname === "/api/auth/logout" && method === "POST") {
        clearAuthCookie(res, req);
        sendJson(res, 200, { ok: true });
        return;
      }

      next();
      return;
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      const username = getAuthenticatedUsername(req);
      if (!username) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      sendJson(res, 200, {
        username,
        canUsePopPlacementOnline: accountCanUsePopPlacement(username),
        canUseTradeFeatures: accountCanUseTradeFeatures(username),
        tweetProfile: getAccountTweetProfileForUser(username),
      });
      return;
    }

    if (getAuthenticatedUsername(req)) {
      next();
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (wantsHtmlDocument(req, pathname)) {
      sendLoginPage(res);
      return;
    }

    res.statusCode = 401;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Unauthorized");
  };
}

export { accountCanUsePopPlacement };
