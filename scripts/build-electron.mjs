import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("electron-dist", { recursive: true });

await esbuild.build({
  entryPoints: ["server/startServer.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "electron-dist/server.cjs",
  logLevel: "info",
});

await esbuild.build({
  entryPoints: ["electron/main.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "electron-dist/main.cjs",
  external: ["electron", "./server.cjs"],
  logLevel: "info",
});

console.log("Electron bundles written to electron-dist/");
