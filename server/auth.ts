import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { sendJson } from "./http";

const AUTH_COOKIE = "pop_auth";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const REGISTER_URL = "https://forms.gle/ZXUcXjMJgXqVH9uB8";

/** 変更すると既存のログイン Cookie がすべて無効になります */
const AUTH_VERSION = process.env.AUTH_VERSION ?? "2";

interface SiteAccount {
  username: string;
  password: string;
}

function getSiteAccounts(): SiteAccount[] {
  return [{ username: "Yousei710", password: process.env.ACCOUNT_YOUSEI710_PASSWORD ?? "as214117" }];
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

function isAuthenticated(req: IncomingMessage): boolean {
  const token = parseCookies(req)[AUTH_COOKIE];
  if (!token) return false;

  return getSiteAccounts().some((account) => {
    const expected = createAuthToken(account.username);
    if (token.length !== expected.length) return false;
    return safeEqual(token, expected);
  });
}

function verifyCredentials(username: string, password: string): string | null {
  const trimmedUsername = username.trim();
  if (!trimmedUsername || !password) return null;

  for (const account of getSiteAccounts()) {
    if (safeEqual(trimmedUsername, account.username) && safeEqual(password, account.password)) {
      return account.username;
    }
  }

  return null;
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

const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>ログイン - POP作成ツール</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f8;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --danger: #dc2626;
      --radius-md: 12px;
      --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
      --font: "Noto Sans JP", system-ui, -apple-system, sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg);
      font-family: var(--font);
      color: var(--text);
    }

    .login-card {
      width: min(100%, 360px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      padding: 28px 24px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
    }

    p {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .field {
      margin-bottom: 14px;
    }

    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
    }

    input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    button,
    .register-link {
      width: 100%;
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-block;
    }

    button[type="submit"] {
      border: none;
      background: var(--primary);
      color: #fff;
    }

    button[type="submit"]:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    button[type="submit"]:disabled {
      opacity: 0.7;
      cursor: wait;
    }

    .register-link {
      margin-top: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
    }

    .register-link:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .error {
      margin-top: 12px;
      font-size: 13px;
      color: var(--danger);
      min-height: 1.2em;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>POP作成ツール</h1>
    <p>アカウント名とパスワードを入力してください。</p>
    <form id="login-form">
      <div class="field">
        <label for="username">アカウント名</label>
        <input id="username" name="username" type="text" autocomplete="username" required autofocus>
      </div>
      <div class="field">
        <label for="password">パスワード</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
      </div>
      <button type="submit" id="submit">ログイン</button>
      <p class="error" id="error" role="alert" aria-live="polite"></p>
    </form>
    <a class="register-link" href="${REGISTER_URL}" target="_blank" rel="noopener noreferrer">
      アカウント登録
    </a>
  </div>
  <script>
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("submit");
    const errorEl = document.getElementById("error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      submitButton.disabled = true;
      submitButton.textContent = "確認中...";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value,
          }),
        });

        if (response.ok) {
          window.location.replace("/");
          return;
        }

        const data = await response.json().catch(() => ({}));
        errorEl.textContent = data.error || "ログインに失敗しました";
      } catch {
        errorEl.textContent = "通信に失敗しました";
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "ログイン";
      }
    });
  </script>
</body>
</html>`;

export function createAuthMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/api/auth/login" && req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as { username?: string; password?: string } | null;
        const username = typeof body?.username === "string" ? body.username : "";
        const password = typeof body?.password === "string" ? body.password : "";
        const authenticatedUsername = verifyCredentials(username, password);

        if (!authenticatedUsername) {
          sendJson(res, 401, { error: "アカウント名またはパスワードが正しくありません" });
          return;
        }

        setAuthCookie(res, req, authenticatedUsername);
        sendJson(res, 200, { ok: true });
      } catch {
        sendJson(res, 400, { error: "リクエストが不正です" });
      }
      return;
    }

    if (isAuthenticated(req)) {
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
