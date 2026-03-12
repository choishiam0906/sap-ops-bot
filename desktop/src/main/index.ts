import "dotenv/config";

import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { OAuthManager } from "./auth/oauthManager.js";
import { SecureStore } from "./auth/secureStore.js";
import { OpenAiProvider } from "./providers/openaiProvider.js";
import { AnthropicProvider } from "./providers/anthropicProvider.js";
import { GoogleProvider } from "./providers/googleProvider.js";
import { CopilotProvider } from "./providers/copilotProvider.js";
import { ChatRuntime } from "./chatRuntime.js";
import { CboAnalyzer } from "./cbo/analyzer.js";
import { CboBatchRuntime } from "./cbo/batchRuntime.js";
import {
  AgentExecutionRepository,
  AuditRepository,
  CboAnalysisRepository,
  ClosingPlanRepository,
  ClosingStepRepository,
  ConfiguredSourceRepository,
  MessageRepository,
  ProviderAccountRepository,
  RoutineExecutionRepository,
  RoutineKnowledgeLinkRepository,
  RoutineTemplateRepository,
  SessionRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "./storage/repositories.js";
import { RoutineExecutor } from "./services/routineExecutor.js";
import { seedRoutineTemplates } from "./services/routineSeedData.js";
import { AgentExecutor } from "./agents/executor.js";
import { LocalDatabase } from "./storage/sqlite.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { SkillSourceRegistry } from "./skills/registry.js";
import { LocalFolderSourceLibrary } from "./sources/localFolderLibrary.js";
import { McpConnector } from "./sources/mcpConnector.js";
import { registerAllIpcHandlers } from "./ipc/index.js";
import type { IpcContext } from "./ipc/index.js";

let mainWindow: BrowserWindow | null = null;
const mainDir = fileURLToPath(new URL(".", import.meta.url));
const productName = "SAP Assistant Desktop Platform";
const appUserModelId = "com.boxlogodev.sap-assistant";

let ipcContext: IpcContext;

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

  const auditRepo = new AuditRepository(db);
  const vaultRepo = new VaultRepository(db);
  const closingPlanRepo = new ClosingPlanRepository(db);
  const closingStepRepo = new ClosingStepRepository(db);
  const routineTemplateRepo = new RoutineTemplateRepository(db);
  const routineExecutionRepo = new RoutineExecutionRepository(db);
  const routineKnowledgeLinkRepo = new RoutineKnowledgeLinkRepository(db);

  // 시드 데이터: 첫 실행 시 기본 SAP 루틴 템플릿 삽입
  seedRoutineTemplates(routineTemplateRepo);

  const routineExecutor = new RoutineExecutor(
    routineTemplateRepo, routineExecutionRepo, closingPlanRepo, closingStepRepo
  );

  // 앱 시작 시 루틴 자동 실행
  routineExecutor.executeDueRoutines();

  const agentExecutionRepo = new AgentExecutionRepository(db);

  const localFolderLibrary = new LocalFolderSourceLibrary(configuredSourceRepo, sourceDocumentRepo);
  const mcpConnector = new McpConnector(configuredSourceRepo, sourceDocumentRepo);

  const copilotProvider = new CopilotProvider();
  const providers = [openaiProvider, anthropicProvider, googleProvider, copilotProvider];
  const skillRegistry = new SkillSourceRegistry(
    vaultRepo,
    analysisRepo,
    configuredSourceRepo,
    sourceDocumentRepo
  );
  const chatRuntime = new ChatRuntime(
    providers, secureStore, sessionRepo, messageRepo,
    auditRepo, skillRegistry
  );
  const oauthManager = new OAuthManager(secureStore, accountRepo, config);

  const agentExecutor = new AgentExecutor(chatRuntime, skillRegistry, agentExecutionRepo);

  const cboAnalyzer = new CboAnalyzer(providers, secureStore);
  const cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    analysisRepo,
    config.backendApiBaseUrl,
    vaultRepo
  );

  ipcContext = {
    oauthManager,
    chatRuntime,
    cboAnalyzer,
    cboBatchRuntime,
    auditRepo,
    vaultRepo,
    sessionRepo,
    skillRegistry,
    configuredSourceRepo,
    sourceDocumentRepo,
    localFolderLibrary,
    mcpConnector,
    closingPlanRepo,
    closingStepRepo,
    routineTemplateRepo,
    routineExecutionRepo,
    routineKnowledgeLinkRepo,
    routineExecutor,
    agentExecutionRepo,
    agentExecutor,
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
  createWindow();
  checkForUpdates();
  logger.info("윈도우 생성 완료");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
