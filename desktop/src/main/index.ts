import "dotenv/config";

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { OAuthManager } from "./auth/oauthManager.js";
import { SecureStore } from "./auth/secureStore.js";
import {
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  ProviderType,
  SendMessageInput,
  SetApiKeyInput,
} from "./contracts.js";
import { CopilotProvider } from "./providers/copilotProvider.js";
import { CodexProvider } from "./providers/codexProvider.js";
import { ChatRuntime } from "./chatRuntime.js";
import { CboAnalyzer } from "./cbo/analyzer.js";
import { CboBatchRuntime } from "./cbo/batchRuntime.js";
import {
  CboAnalysisRepository,
  MessageRepository,
  ProviderAccountRepository,
  SessionRepository,
} from "./storage/repositories.js";
import { LocalDatabase } from "./storage/sqlite.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

let mainWindow: BrowserWindow | null = null;
let chatRuntime: ChatRuntime;
let oauthManager: OAuthManager;
let cboAnalyzer: CboAnalyzer;
let cboBatchRuntime: CboBatchRuntime;
const mainDir = fileURLToPath(new URL(".", import.meta.url));

function initRuntime(): void {
  const config = loadConfig();
  const dbPath = join(app.getPath("userData"), "sap-ops-bot.sqlite");
  const db = new LocalDatabase(dbPath);

  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const accountRepo = new ProviderAccountRepository(db);
  const analysisRepo = new CboAnalysisRepository(db);
  const secureStore = new SecureStore("sap-ops-bot-desktop");

  const codexProvider = new CodexProvider(
    config.codexOAuthVerificationUrl,
    config.codexOAuthTokenUrl,
    config.codexApiBaseUrl
  );
  const copilotProvider = new CopilotProvider(
    config.copilotOAuthVerificationUrl,
    config.copilotOAuthTokenUrl,
    config.copilotApiBaseUrl
  );

  const providers = [codexProvider, copilotProvider];
  chatRuntime = new ChatRuntime(providers, secureStore, sessionRepo, messageRepo);
  oauthManager = new OAuthManager(providers, secureStore, accountRepo);
  cboAnalyzer = new CboAnalyzer(providers, secureStore);
  cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    analysisRepo,
    config.backendApiBaseUrl
  );
}

function createWindow(): void {
  const config = loadConfig();
  mainWindow = new BrowserWindow({
    width: config.windowWidth,
    height: config.windowHeight,
    webPreferences: {
      preload: join(mainDir, "../preload/index.js"),
    },
  });

  mainWindow.loadFile(join(mainDir, "../../dist-renderer/index.html"));
}

function registerIpc(): void {
  ipcMain.handle("auth:setApiKey", async (_event, input: SetApiKeyInput) => {
    return oauthManager.setApiKey(input);
  });

  ipcMain.handle("auth:status", async (_event, provider: ProviderType) => {
    return oauthManager.getStatus(provider);
  });

  ipcMain.handle("auth:logout", async (_event, provider: ProviderType) => {
    return oauthManager.logout(provider);
  });

  ipcMain.handle("chat:send", async (_event, input: SendMessageInput) => {
    return chatRuntime.sendMessage(input);
  });

  ipcMain.handle("sessions:list", async (_event, limit = 50) => {
    return chatRuntime.listSessions(limit);
  });

  ipcMain.handle(
    "sessions:messages",
    async (_event, sessionId: string, limit = 100) => {
      return chatRuntime.getMessages(sessionId, limit);
    }
  );

  ipcMain.handle("cbo:analyzeText", async (_event, input: CboAnalyzeTextInput) => {
    return cboAnalyzer.analyzeText(input);
  });

  ipcMain.handle("cbo:analyzeFile", async (_event, input: CboAnalyzeFileInput) => {
    return cboAnalyzer.analyzeFile(input);
  });

  ipcMain.handle("cbo:analyzeFolder", async (_event, input: CboAnalyzeFolderInput) => {
    return cboBatchRuntime.analyzeFolder(input);
  });

  ipcMain.handle(
    "cbo:pickAndAnalyzeFile",
    async (_event, input: CboAnalyzePickInput = {}) => {
      const dialogOptions: OpenDialogOptions = {
        title: "CBO 소스 파일 선택",
        properties: ["openFile"],
        filters: [{ name: "Text/Markdown", extensions: ["txt", "md"] }],
      };
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          filePath: null,
          result: null,
        };
      }

      const filePath = selection.filePaths[0];
      const result = await cboAnalyzer.analyzeFile({
        filePath,
        provider: input.provider,
        model: input.model,
      });

      return {
        canceled: false,
        filePath,
        result,
      };
    }
  );

  ipcMain.handle(
    "cbo:pickAndAnalyzeFolder",
    async (_event, input: CboAnalyzeFolderPickInput = {}) => {
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          rootPath: null,
          output: null,
        };
      }

      const rootPath = selection.filePaths[0];
      const output = await cboBatchRuntime.analyzeFolder({
        rootPath,
        recursive: input.recursive,
        provider: input.provider,
        model: input.model,
        skipUnchanged: input.skipUnchanged,
      });

      return {
        canceled: false,
        rootPath,
        output,
      };
    }
  );

  ipcMain.handle("cbo:runs:list", async (_event, limit = 20) => {
    return cboBatchRuntime.listRuns(limit);
  });

  ipcMain.handle(
    "cbo:runs:detail",
    async (_event, runId: string, limitFiles = 500) => {
      return cboBatchRuntime.getRunDetail(runId, limitFiles);
    }
  );

  ipcMain.handle(
    "cbo:runs:syncKnowledge",
    async (_event, input: CboSyncKnowledgeInput) => {
      return cboBatchRuntime.syncRunToKnowledge(input);
    }
  );

  ipcMain.handle("cbo:runs:diff", async (_event, input: CboRunDiffInput) => {
    return cboBatchRuntime.diffRuns(input);
  });
}

app.whenReady().then(() => {
  logger.info({ version: app.getVersion() }, "앱 시작");
  initRuntime();
  registerIpc();
  createWindow();
  logger.info("윈도우 생성 완료");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
