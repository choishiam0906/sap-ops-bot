import { SecureStore } from "../auth/secureStore.js";
import type { LocalDatabase } from "../storage/sqlite.js";
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
  ScheduledTaskRepository,
  ScheduleLogRepository,
  SessionRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "../storage/repositories/index.js";

export interface Repositories {
  sessionRepo: SessionRepository;
  messageRepo: MessageRepository;
  accountRepo: ProviderAccountRepository;
  analysisRepo: CboAnalysisRepository;
  configuredSourceRepo: ConfiguredSourceRepository;
  sourceDocumentRepo: SourceDocumentRepository;
  auditRepo: AuditRepository;
  vaultRepo: VaultRepository;
  closingPlanRepo: ClosingPlanRepository;
  closingStepRepo: ClosingStepRepository;
  routineTemplateRepo: RoutineTemplateRepository;
  routineExecutionRepo: RoutineExecutionRepository;
  routineKnowledgeLinkRepo: RoutineKnowledgeLinkRepository;
  scheduledTaskRepo: ScheduledTaskRepository;
  scheduleLogRepo: ScheduleLogRepository;
  agentExecutionRepo: AgentExecutionRepository;
  secureStore: SecureStore;
}

export function createRepositories(db: LocalDatabase): Repositories {
  return {
    sessionRepo: new SessionRepository(db),
    messageRepo: new MessageRepository(db),
    accountRepo: new ProviderAccountRepository(db),
    analysisRepo: new CboAnalysisRepository(db),
    configuredSourceRepo: new ConfiguredSourceRepository(db),
    sourceDocumentRepo: new SourceDocumentRepository(db),
    auditRepo: new AuditRepository(db),
    vaultRepo: new VaultRepository(db),
    closingPlanRepo: new ClosingPlanRepository(db),
    closingStepRepo: new ClosingStepRepository(db),
    routineTemplateRepo: new RoutineTemplateRepository(db),
    routineExecutionRepo: new RoutineExecutionRepository(db),
    routineKnowledgeLinkRepo: new RoutineKnowledgeLinkRepository(db),
    scheduledTaskRepo: new ScheduledTaskRepository(db),
    scheduleLogRepo: new ScheduleLogRepository(db),
    agentExecutionRepo: new AgentExecutionRepository(db),
    secureStore: new SecureStore("sap-ops-bot-desktop"),
  };
}
