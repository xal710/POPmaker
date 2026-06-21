import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import connect from "connect";
import serveStatic from "serve-static";
import { createAuthMiddleware } from "./auth";
import { createCardImageMiddleware } from "./cardImageApi";
import { createComparisonMiddleware } from "./comparisonApi";
import { ensureComparisonDataFile } from "./config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const port = Number(process.env.PORT) || 3000;

ensureComparisonDataFile();

const app = connect();

app.use(createAuthMiddleware());
app.use(createComparisonMiddleware());
app.use(createCardImageMiddleware());
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});
app.use(
  serveStatic(dist, {
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
  res.end(readFileSync(resolve(dist, "index.html"), "utf-8"));
});

createServer(app).listen(port, "0.0.0.0", () => {
  console.log(`POP tool running at http://0.0.0.0:${port}`);
});
