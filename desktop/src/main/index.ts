import "dotenv/config";

import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createRepositories } from "./bootstrap/createRepositories.js";
import { createServices } from "./bootstrap/createServices.js";
import { seedData } from "./bootstrap/seedData.js";
import { loadConfig } from "./config.js";
import { registerAllIpcHandlers } from "./ipc/index.js";
import type { IpcContext } from "./ipc/index.js";
import { registerPolicyHandlers } from "./ipc/policyHandlers.js";
import { logger } from "./logger.js";
import { LocalDatabase } from "./storage/sqlite.js";

let mainWindow: BrowserWindow | null = null;
const mainDir = fileURLToPath(new URL(".", import.meta.url));
const productName = "SAP Assistant Desktop Platform";
const appUserModelId = "com.boxlogodev.sap-assistant";

let ipcContext: IpcContext;

function initRuntime(): void {
  const config = loadConfig();
  const dbPath = join(app.getPath("userData"), "sap-ops-bot.sqlite");
  const db = new LocalDatabase(dbPath);

  const repos = createRepositories(db);
  const services = createServices(config, repos, db, () => mainWindow);
  seedData(repos, services);

  ipcContext = {
    ...repos,
    ...services,
    getMainWindow: () => mainWindow,
  };
}

function createWindow(): void {
  const config = loadConfig();
  const windowIconPath = join(mainDir, "../../build/icon.png");
  mainWindow = new BrowserWindow({
    title: productName,
    width: config.windowWidth,
    height: config.windowHeight,
    icon: existsSync(windowIconPath) ? windowIconPath : undefined,
    webPreferences: {
      preload: join(mainDir, "../preload/index.js"),
    },
  });

  mainWindow.loadFile(join(mainDir, "../../dist-renderer/index.html"));
}

function checkForUpdates(): void {
  if (!app.isPackaged) return;

  autoUpdater.logger = logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    logger.info({ version: info.version }, "업데이트 사용 가능");
  });
  autoUpdater.on("update-downloaded", (info) => {
    logger.info({ version: info.version }, "업데이트 다운로드 완료 — 종료 시 설치");
  });
  autoUpdater.on("error", (err) => {
    logger.error({ err }, "자동 업데이트 에러");
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  app.setName(productName);
  if (process.platform === "win32") {
    app.setAppUserModelId(appUserModelId);
  }
  logger.info({ version: app.getVersion() }, "앱 시작");
  initRuntime();
  registerAllIpcHandlers(ipcContext);
  registerPolicyHandlers({
    policyEngine: ipcContext.policyEngine,
    approvalManager: ipcContext.approvalManager,
  });
  createWindow();
  checkForUpdates();
  logger.info("윈도우 생성 완료");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (ipcContext?.routineScheduler) {
    ipcContext.routineScheduler.stopAll();
  }
});
