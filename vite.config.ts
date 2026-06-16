import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createCardImageMiddleware } from "./server/cardImageApi";
import { createComparisonMiddleware } from "./server/comparisonApi";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "pop-tool-api",
      configureServer(server) {
        server.middlewares.use(createComparisonMiddleware());
        server.middlewares.use(createCardImageMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createComparisonMiddleware());
        server.middlewares.use(createCardImageMiddleware());
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
});
