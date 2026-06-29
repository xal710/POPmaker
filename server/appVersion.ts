import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getProjectRoot } from "./config";

let cachedBuildId: string | null = null;

function readBuildIdFile(): string | null {
  const buildIdPath = resolve(getProjectRoot(), "dist/build-id.txt");
  if (!existsSync(buildIdPath)) return null;

  const value = readFileSync(buildIdPath, "utf8").trim();
  return value || null;
}

export function getAppVersion(): string {
  if (cachedBuildId) return cachedBuildId;

  cachedBuildId =
    readBuildIdFile() ??
    process.env.APP_BUILD_ID ??
    process.env.RENDER_GIT_COMMIT ??
    process.env.GIT_COMMIT ??
    "dev";

  return cachedBuildId;
}
