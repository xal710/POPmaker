import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { fetchCardImage } from "./hareruya";
import { fetchImageBuffer, prefetchImage } from "./imageCache";
import { sendJson } from "./http";

const PROXY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/*",
};

function isAllowedProxyImageUrl(imageUrl: string): boolean {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "https:") return false;
    return (
      parsed.hostname === "www.hareruya2.com" ||
      parsed.hostname.endsWith(".hareruya2.com") ||
      parsed.hostname.endsWith(".shopify.com") ||
      parsed.hostname.endsWith(".shopifycdn.com")
    );
  } catch {
    return false;
  }
}

async function handleProxyImage(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "", "http://localhost");
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl || !isAllowedProxyImageUrl(imageUrl)) {
    sendJson(res, 400, { error: "許可されていない画像URLです" });
    return;
  }

  const cached = await fetchImageBuffer(imageUrl);
  if (cached) {
    res.statusCode = 200;
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(cached.buffer);
    return;
  }

  try {
    await prefetchImage(imageUrl);
    const retried = await fetchImageBuffer(imageUrl);
    if (retried) {
      res.statusCode = 200;
      res.setHeader("Content-Type", retried.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(retried.buffer);
      return;
    }
  } catch {
    // fall through
  }

  const response = await fetch(imageUrl, { headers: PROXY_HEADERS });
  if (!response.ok) {
    sendJson(res, response.status, { error: "画像の取得に失敗しました" });
    return;
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.end(buffer);
}

export function createCardImageMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    if (req.url?.startsWith("/api/proxy-image")) {
      try {
        await handleProxyImage(req, res);
      } catch (error) {
        const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
        sendJson(res, 500, { error: message });
      }
      return;
    }

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

      const refresh = url.searchParams.get("refresh") === "1";
      const result = await fetchCardImage(cardName, { refresh });
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "画像の取得に失敗しました";
      sendJson(res, 500, { error: message });
    }
  };
}
