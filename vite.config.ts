import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createAuthMiddleware } from "./server/auth";
import { createCardImageMiddleware } from "./server/cardImageApi";
import { createComparisonMiddleware } from "./server/comparisonApi";
import { createTweetHistoryMiddleware } from "./server/tweetHistoryApi";

const isProductionBuild = process.env.NODE_ENV === "production";
const appBuildId = isProductionBuild
  ? `${process.env.RENDER_GIT_COMMIT ?? "unknown"}-${Date.now()}`
  : "dev";

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  plugins: [
    react(),
    {
      name: "pop-build-id",
      closeBundle() {
        if (!isProductionBuild) return;
        writeFileSync(resolve("dist/build-id.txt"), appBuildId, "utf8");
      },
    },
    {
      name: "pop-tool-api",
      configureServer(server) {
        server.middlewares.use(createAuthMiddleware());
        server.middlewares.use(createComparisonMiddleware());
        server.middlewares.use(createCardImageMiddleware());
        server.middlewares.use(createTweetHistoryMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createAuthMiddleware());
        server.middlewares.use(createComparisonMiddleware());
        server.middlewares.use(createCardImageMiddleware());
        server.middlewares.use(createTweetHistoryMiddleware());
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
});
