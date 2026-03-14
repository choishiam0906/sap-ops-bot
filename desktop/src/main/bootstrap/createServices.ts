import type { BrowserWindow } from "electron";

import { OAuthManager } from "../auth/oauthManager.js";
import { ChatRuntime } from "../chatRuntime.js";
import { CboAnalyzer } from "../cbo/analyzer.js";
import { CboBatchRuntime } from "../cbo/batchRuntime.js";
import type { AppConfig } from "../config.js";
import { AgentExecutor } from "../agents/executor.js";
import { PolicyEngine } from "../policy/policyEngine.js";
import { ApprovalManager } from "../policy/approvalManager.js";
import { OpenAiProvider } from "../providers/openaiProvider.js";
import { AnthropicProvider } from "../providers/anthropicProvider.js";
import { GoogleProvider } from "../providers/googleProvider.js";
import { CopilotProvider } from "../providers/copilotProvider.js";
import { RoutineExecutor } from "../services/routineExecutor.js";
import { RoutineScheduler } from "../services/routineScheduler.js";
import { SkillSourceRegistry } from "../skills/registry.js";
import { LocalFolderSourceLibrary } from "../sources/localFolderLibrary.js";
import { McpConnector } from "../sources/mcpConnector.js";
import type { LocalDatabase } from "../storage/sqlite.js";
import type { Repositories } from "./createRepositories.js";

export interface Services {
  oauthManager: OAuthManager;
  chatRuntime: ChatRuntime;
  cboAnalyzer: CboAnalyzer;
  cboBatchRuntime: CboBatchRuntime;
  skillRegistry: SkillSourceRegistry;
  localFolderLibrary: LocalFolderSourceLibrary;
  mcpConnector: McpConnector;
  routineExecutor: RoutineExecutor;
  routineScheduler: RoutineScheduler;
  agentExecutor: AgentExecutor;
  policyEngine: PolicyEngine;
  approvalManager: ApprovalManager;
}

export function createServices(
  config: AppConfig,
  repos: Repositories,
  db: LocalDatabase,
  getMainWindow: () => BrowserWindow | null,
): Services {
  const openaiProvider = new OpenAiProvider(config.openaiApiBaseUrl);
  const anthropicProvider = new AnthropicProvider(config.anthropicApiBaseUrl);
  const googleProvider = new GoogleProvider(config.googleApiBaseUrl);
  const copilotProvider = new CopilotProvider();
  const providers = [openaiProvider, anthropicProvider, googleProvider, copilotProvider];

  const skillRegistry = new SkillSourceRegistry(
    repos.vaultRepo,
    repos.analysisRepo,
    repos.configuredSourceRepo,
    repos.sourceDocumentRepo,
  );

  const chatRuntime = new ChatRuntime(
    providers,
    repos.secureStore,
    repos.sessionRepo,
    repos.messageRepo,
    repos.auditRepo,
    skillRegistry,
  );

  const oauthManager = new OAuthManager(repos.secureStore, repos.accountRepo, config);

  const localFolderLibrary = new LocalFolderSourceLibrary(
    repos.configuredSourceRepo,
    repos.sourceDocumentRepo,
  );
  const mcpConnector = new McpConnector(repos.configuredSourceRepo, repos.sourceDocumentRepo);

  const routineExecutor = new RoutineExecutor(
    repos.routineTemplateRepo,
    repos.routineExecutionRepo,
    repos.closingPlanRepo,
    repos.closingStepRepo,
  );

  const routineScheduler = new RoutineScheduler(
    repos.scheduledTaskRepo,
    repos.scheduleLogRepo,
    routineExecutor,
    getMainWindow,
  );

  const agentExecutor = new AgentExecutor(chatRuntime, skillRegistry, repos.agentExecutionRepo);

  const cboAnalyzer = new CboAnalyzer(providers, repos.secureStore);
  const cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    repos.analysisRepo,
    config.backendApiBaseUrl,
    repos.vaultRepo,
  );

  const policyEngine = new PolicyEngine(db);
  const approvalManager = new ApprovalManager();

  return {
    oauthManager,
    chatRuntime,
    cboAnalyzer,
    cboBatchRuntime,
    skillRegistry,
    localFolderLibrary,
    mcpConnector,
    routineExecutor,
    routineScheduler,
    agentExecutor,
    policyEngine,
    approvalManager,
  };
}
