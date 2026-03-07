import "dotenv/config";

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { OAuthManager } from "./auth/oauthManager.js";
import { SecureStore } from "./auth/secureStore.js";
import {
  AuditSearchFilters,
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  DomainPack,
  PickAndAddLocalFolderSourceInput,
  ProviderType,
  SapLabel,
  SourceDocumentSearchInput,
  SessionFilter,
  SkillExecutionContext,
  SendMessageInput,
  SetApiKeyInput,
  TodoStateKind,
  VaultClassification,
} from "./contracts.js";
import { OpenAiProvider } from "./providers/openaiProvider.js";
import { AnthropicProvider } from "./providers/anthropicProvider.js";
import { GoogleProvider } from "./providers/googleProvider.js";
import { ChatRuntime } from "./chatRuntime.js";
import { CboAnalyzer } from "./cbo/analyzer.js";
import { CboBatchRuntime } from "./cbo/batchRuntime.js";
import { PolicyEngine } from "./policy/policyEngine.js";
import {
  AuditRepository,
  CboAnalysisRepository,
  ConfiguredSourceRepository,
  MessageRepository,
  ProviderAccountRepository,
  SessionRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "./storage/repositories.js";
import { LocalDatabase } from "./storage/sqlite.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { SkillSourceRegistry } from "./skills/registry.js";
import { LocalFolderSourceLibrary } from "./sources/localFolderLibrary.js";

let mainWindow: BrowserWindow | null = null;
let chatRuntime: ChatRuntime;
let oauthManager: OAuthManager;
let cboAnalyzer: CboAnalyzer;
let cboBatchRuntime: CboBatchRuntime;
let auditRepo: AuditRepository;
let vaultRepoRef: VaultRepository;
let sessionRepoRef: SessionRepository;
let skillRegistry: SkillSourceRegistry;
let configuredSourceRepoRef: ConfiguredSourceRepository;
let sourceDocumentRepoRef: SourceDocumentRepository;
let localFolderLibrary: LocalFolderSourceLibrary;
let folderAbortController: AbortController | null = null;
const mainDir = fileURLToPath(new URL(".", import.meta.url));
const productName = "SAP Assistant Desktop Platform";
const appUserModelId = "com.sapassistantdesktop.platform";

function initRuntime(): void {
  const config = loadConfig();
  const dbPath = join(app.getPath("userData"), "sap-ops-bot.sqlite");
  const db = new LocalDatabase(dbPath);

  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const accountRepo = new ProviderAccountRepository(db);
  const analysisRepo = new CboAnalysisRepository(db);
  const configuredSourceRepo = new ConfiguredSourceRepository(db);
  const sourceDocumentRepo = new SourceDocumentRepository(db);
  const secureStore = new SecureStore("sap-ops-bot-desktop");

  const openaiProvider = new OpenAiProvider(config.openaiApiBaseUrl);
  const anthropicProvider = new AnthropicProvider(config.anthropicApiBaseUrl);
  const googleProvider = new GoogleProvider(config.googleApiBaseUrl);

  auditRepo = new AuditRepository(db);
  sessionRepoRef = sessionRepo;
  configuredSourceRepoRef = configuredSourceRepo;
  sourceDocumentRepoRef = sourceDocumentRepo;
  const policyEngine = new PolicyEngine();
  const vaultRepo = new VaultRepository(db);
  vaultRepoRef = vaultRepo;
  localFolderLibrary = new LocalFolderSourceLibrary(configuredSourceRepo, sourceDocumentRepo);

  const providers = [openaiProvider, anthropicProvider, googleProvider];
  skillRegistry = new SkillSourceRegistry(
    vaultRepo,
    analysisRepo,
    configuredSourceRepo,
    sourceDocumentRepo
  );
  chatRuntime = new ChatRuntime(
    providers, secureStore, sessionRepo, messageRepo,
    policyEngine, auditRepo, skillRegistry
  );
  oauthManager = new OAuthManager(secureStore, accountRepo, config);

  cboAnalyzer = new CboAnalyzer(providers, secureStore);
  cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    analysisRepo,
    config.backendApiBaseUrl,
    vaultRepo
  );
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

  ipcMain.handle("auth:oauthAvailability", async () => {
    return oauthManager.getOAuthAvailability();
  });

  ipcMain.handle("auth:initiateOAuth", async (_event, provider: ProviderType) => {
    return oauthManager.initiateOAuth(provider);
  });

  ipcMain.handle("auth:waitOAuthCallback", async (_event, provider: ProviderType) => {
    return oauthManager.waitForOAuthCallback(provider);
  });

  ipcMain.handle("auth:cancelOAuth", async (_event, provider: ProviderType) => {
    return oauthManager.cancelOAuth(provider);
  });

  ipcMain.handle("auth:submitOAuthCode", async (_event, provider: ProviderType, code: string) => {
    return oauthManager.submitOAuthCode(provider, code);
  });

  ipcMain.handle("chat:send", async (_event, input: SendMessageInput) => {
    return chatRuntime.sendMessage(input);
  });

  ipcMain.handle("skills:list", async () => {
    return skillRegistry.listSkills();
  });

  ipcMain.handle("skills:listPacks", async () => {
    return skillRegistry.listPacks();
  });

  ipcMain.handle("skills:recommend", async (_event, context: SkillExecutionContext) => {
    return skillRegistry.recommendSkills(context);
  });

  ipcMain.handle("sources:list", async (_event, context: SkillExecutionContext) => {
    return skillRegistry.listSources(context);
  });

  ipcMain.handle("sources:search", async (_event, query: string, context: SkillExecutionContext) => {
    return skillRegistry.searchSources(query, context);
  });

  ipcMain.handle("sources:listConfigured", async () => {
    return configuredSourceRepoRef.list();
  });

  ipcMain.handle(
    "sources:pickAndAddLocalFolder",
    async (_event, input: PickAndAddLocalFolderSourceInput) => {
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          source: null,
          summary: null,
        };
      }

      const output = await localFolderLibrary.addLocalFolder(selection.filePaths[0], input);
      return {
        canceled: false,
        source: output.source,
        summary: output.summary,
      };
    }
  );

  ipcMain.handle("sources:reindex", async (_event, sourceId: string) => {
    const summary = await localFolderLibrary.reindexSource(sourceId);
    return {
      source: configuredSourceRepoRef.getById(sourceId),
      summary,
    };
  });

  ipcMain.handle("sources:searchDocuments", async (_event, input: SourceDocumentSearchInput) => {
    return localFolderLibrary.searchDocuments(input);
  });

  ipcMain.handle("sources:getDocument", async (_event, documentId: string) => {
    return sourceDocumentRepoRef.getById(documentId);
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
    folderAbortController = new AbortController();
    try {
      return await cboBatchRuntime.analyzeFolder(input, {
        signal: folderAbortController.signal,
        onProgress: (event) => mainWindow?.webContents.send("cbo:progress", event),
      });
    } finally {
      folderAbortController = null;
    }
  });

  ipcMain.handle("cbo:cancelFolder", () => {
    folderAbortController?.abort();
    folderAbortController = null;
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
          securityMode: input.securityMode,
          domainPack: input.domainPack,
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
      folderAbortController = new AbortController();
      let output: Awaited<ReturnType<typeof cboBatchRuntime.analyzeFolder>>;
      try {
        output = await cboBatchRuntime.analyzeFolder(
            {
              rootPath,
              recursive: input.recursive,
              provider: input.provider,
              model: input.model,
              skipUnchanged: input.skipUnchanged,
              securityMode: input.securityMode,
              domainPack: input.domainPack,
            },
          {
            signal: folderAbortController.signal,
            onProgress: (event) => mainWindow?.webContents.send("cbo:progress", event),
          }
        );
      } finally {
        folderAbortController = null;
      }

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

  ipcMain.handle("audit:list", async (_event, limit = 50) => {
    return auditRepo.list(limit);
  });

  ipcMain.handle("audit:search", async (_event, filters: AuditSearchFilters) => {
    return auditRepo.search(filters);
  });

  ipcMain.handle("vault:list", async (_event, limit = 50) => {
    return vaultRepoRef.list(limit);
  });

  ipcMain.handle(
    "vault:searchByClassification",
    async (_event, classification: VaultClassification, query?: string, limit?: number) => {
      return vaultRepoRef.searchByClassification(classification, query, limit);
    }
  );

  ipcMain.handle("vault:listByDomainPack", async (_event, pack: DomainPack, limit?: number) => {
    return vaultRepoRef.listByDomainPack(pack, limit);
  });

  // ─── Cockpit IPC ───

  ipcMain.handle("sessions:listFiltered", (_event, filter: SessionFilter, limit?: number) =>
    sessionRepoRef.listFiltered(filter, limit));

  ipcMain.handle("sessions:updateTodoState", (_event, sessionId: string, state: TodoStateKind) =>
    sessionRepoRef.updateTodoState(sessionId, state));

  ipcMain.handle("sessions:toggleFlag", (_event, sessionId: string) =>
    sessionRepoRef.toggleFlag(sessionId));

  ipcMain.handle("sessions:toggleArchive", (_event, sessionId: string) =>
    sessionRepoRef.toggleArchive(sessionId));

  ipcMain.handle("sessions:addLabel", (_event, sessionId: string, label: SapLabel) =>
    sessionRepoRef.addLabel(sessionId, label));

  ipcMain.handle("sessions:removeLabel", (_event, sessionId: string, label: SapLabel) =>
    sessionRepoRef.removeLabel(sessionId, label));

  ipcMain.handle("sessions:stats", () =>
    sessionRepoRef.getStats());
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
  registerIpc();
  createWindow();
  checkForUpdates();
  logger.info("윈도우 생성 완료");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
