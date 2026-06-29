import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { createPopApp } from "./createApp";
import { ensureComparisonDataFile, getProjectRoot } from "./config";
import { ensurePopPlacementDataFile } from "./popPlacementBackup";

export interface StartPopServerOptions {
  port?: number;
  host?: string;
  root?: string;
  enableAuth?: boolean;
}

export interface PopServerHandle {
  port: number;
  host: string;
  server: Server;
  close: () => Promise<void>;
}

export async function startPopServer(options: StartPopServerOptions = {}): Promise<PopServerHandle> {
  const root = options.root ?? getProjectRoot();
  const distDir = resolve(root, "dist");
  const host = options.host ?? "127.0.0.1";
  const requestedPort =
    options.port ?? (process.env.PORT ? Number(process.env.PORT) : 3000);

  process.env.PROJECT_ROOT ??= root;
  ensureComparisonDataFile();
  ensurePopPlacementDataFile();

  const app = createPopApp({
    distDir,
    enableAuth: options.enableAuth,
  });
  const server = createServer(app);

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, () => resolveListen());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("サーバーの起動に失敗しました");
  }

  return {
    port: address.port,
    host,
    server,
    close: () =>
      new Promise<void>((resolveClose, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      }),
  };
}
