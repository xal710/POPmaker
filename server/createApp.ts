import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import connect, { type Connect } from "connect";
import serveStatic from "serve-static";
import { createAuthMiddleware } from "./auth";
import { createCardImageMiddleware } from "./cardImageApi";
import { createComparisonMiddleware } from "./comparisonApi";
import { createTweetHistoryMiddleware } from "./tweetHistoryApi";

export interface CreatePopAppOptions {
  distDir: string;
  enableAuth?: boolean;
  enableTweetHistory?: boolean;
}

export function createPopApp(options: CreatePopAppOptions): Connect.Server {
  const {
    distDir,
    enableAuth = process.env.POP_LOCAL !== "1",
    enableTweetHistory = true,
  } = options;
  const app = connect();

  if (enableAuth) {
    app.use(createAuthMiddleware());
  }

  app.use(createComparisonMiddleware());
  app.use(createCardImageMiddleware());
  if (enableTweetHistory) {
    app.use(createTweetHistoryMiddleware());
  }
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.use(
    serveStatic(distDir, {
      index: false,
    }),
  );

  app.use((req, res) => {
    if (req.url?.startsWith("/api/")) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(readFileSync(resolve(distDir, "index.html"), "utf-8"));
  });

  return app;
}
