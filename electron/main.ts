import { app, BrowserWindow } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let closeServer: (() => Promise<void>) | null = null;

function getProjectRoot(): string {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return path.resolve(__dirname, "..");
}

type StartPopServerFn = typeof import("../server/startServer.js").startPopServer;

function loadStartPopServer(): StartPopServerFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const serverModule = require(path.join(__dirname, "server.cjs")) as {
    startPopServer: StartPopServerFn;
  };
  return serverModule.startPopServer;
}

async function bootstrap(): Promise<void> {
  process.env.POP_LOCAL = "1";
  process.env.PROJECT_ROOT = getProjectRoot();
  process.env.DATA_DIR = path.join(app.getPath("userData"), "data");

  const startPopServer = loadStartPopServer();
  const handle = await startPopServer({
    host: "127.0.0.1",
    port: 0,
    enableAuth: false,
  });

  closeServer = handle.close;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: "POP作成ツール",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${handle.port}/`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  void closeServer?.();
});
