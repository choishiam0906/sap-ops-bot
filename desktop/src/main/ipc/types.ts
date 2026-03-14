import type { BrowserWindow } from "electron";
import type { OAuthManager } from "../auth/oauthManager.js";
import type { ChatRuntime } from "../chatRuntime.js";
import type { CboAnalyzer } from "../cbo/analyzer.js";
import type { CboBatchRuntime } from "../cbo/batchRuntime.js";
import type { SkillSourceRegistry } from "../skills/registry.js";
import type { LocalFolderSourceLibrary } from "../sources/localFolderLibrary.js";
import type { McpConnector } from "../sources/mcpConnector.js";
import type {
  AgentExecutionRepository,
  AuditRepository,
  ClosingPlanRepository,
  ClosingStepRepository,
  ConfiguredSourceRepository,
  RoutineExecutionRepository,
  RoutineKnowledgeLinkRepository,
  RoutineTemplateRepository,
  ScheduledTaskRepository,
  ScheduleLogRepository,
  SessionRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "../storage/repositories/index.js";
import type { RoutineExecutor } from "../services/routineExecutor.js";
import type { RoutineScheduler } from "../services/routineScheduler.js";
import type { AgentExecutor } from "../agents/executor.js";
import type { PolicyEngine } from "../policy/policyEngine.js";
import type { ApprovalManager } from "../policy/approvalManager.js";

export interface IpcContext {
  oauthManager: OAuthManager;
  chatRuntime: ChatRuntime;
  cboAnalyzer: CboAnalyzer;
  cboBatchRuntime: CboBatchRuntime;
  auditRepo: AuditRepository;
  vaultRepo: VaultRepository;
  sessionRepo: SessionRepository;
  skillRegistry: SkillSourceRegistry;
  configuredSourceRepo: ConfiguredSourceRepository;
  sourceDocumentRepo: SourceDocumentRepository;
  localFolderLibrary: LocalFolderSourceLibrary;
  mcpConnector: McpConnector;
  closingPlanRepo: ClosingPlanRepository;
  closingStepRepo: ClosingStepRepository;
  routineTemplateRepo: RoutineTemplateRepository;
  routineExecutionRepo: RoutineExecutionRepository;
  routineKnowledgeLinkRepo: RoutineKnowledgeLinkRepository;
  routineExecutor: RoutineExecutor;
  routineScheduler: RoutineScheduler;
  scheduledTaskRepo: ScheduledTaskRepository;
  scheduleLogRepo: ScheduleLogRepository;
  agentExecutionRepo: AgentExecutionRepository;
  agentExecutor: AgentExecutor;
  policyEngine: PolicyEngine;
  approvalManager: ApprovalManager;
  getMainWindow: () => BrowserWindow | null;
}
