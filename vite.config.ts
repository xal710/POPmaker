import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createAuthMiddleware } from "./server/auth";
import { createCardImageMiddleware } from "./server/cardImageApi";
import { createComparisonMiddleware } from "./server/comparisonApi";
import { createTweetHistoryMiddleware } from "./server/tweetHistoryApi";

export default defineConfig({
  plugins: [
    react(),
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

