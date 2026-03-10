import { contextBridge, ipcRenderer } from "electron";

import type {
  ArchiveTreeNode,
  AuditSearchFilters,
  CboBatchProgressEvent,
  ChatSessionMeta,
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStepInput,
  ClosingStepUpdate,
  ConfiguredSource,
  CockpitStats,
  DeviceCodeInitResult,
  DomainPack,
  ListArchiveContentsInput,
  McpResourceInfo,
  McpServerConfigInput,
  PlanStatus,
  PickAndAddLocalFolderSourceInput,
  ProviderType,
  ReadArchiveFileInput,
  RoutineExecution,
  RoutineFrequency,
  RoutineTemplate,
  RoutineTemplateInput,
  RoutineTemplateStep,
  RoutineTemplateUpdate,
  SapLabel,
  SaveArchiveFileInput,
  SendMessageInput,
  SessionFilter,
  SetApiKeyInput,
  SourceIndexSummary,
  TodoStateKind,
  VaultClassification,
  OAuthAvailability,
  OAuthInitResult,
  ProviderAccount,
  SapSkillDefinition,
  SapSourceDefinition,
  SkillPackDefinition,
  SourceDocument,
  SourceDocumentSearchInput,
  SkillExecutionContext,
  SkillRecommendation,
} from "../main/contracts.js";

const desktopApi = {
  setApiKey(input: SetApiKeyInput) {
    return ipcRenderer.invoke("auth:setApiKey", input);
  },
  getAuthStatus(provider: ProviderType) {
    return ipcRenderer.invoke("auth:status", provider);
  },
  logout(provider: ProviderType) {
    return ipcRenderer.invoke("auth:logout", provider);
  },
  getOAuthAvailability(): Promise<OAuthAvailability[]> {
    return ipcRenderer.invoke("auth:oauthAvailability");
  },
  initiateOAuth(provider: ProviderType): Promise<OAuthInitResult> {
    return ipcRenderer.invoke("auth:initiateOAuth", provider);
  },
  waitOAuthCallback(provider: ProviderType): Promise<ProviderAccount> {
    return ipcRenderer.invoke("auth:waitOAuthCallback", provider);
  },
  cancelOAuth(provider: ProviderType): Promise<void> {
    return ipcRenderer.invoke("auth:cancelOAuth", provider);
  },
  submitOAuthCode(provider: ProviderType, code: string): Promise<ProviderAccount> {
    return ipcRenderer.invoke("auth:submitOAuthCode", provider, code);
  },
  // GitHub Device Code (Copilot)
  initiateDeviceCode(): Promise<DeviceCodeInitResult> {
    return ipcRenderer.invoke("auth:initiateDeviceCode");
  },
  pollDeviceCode(): Promise<ProviderAccount> {
    return ipcRenderer.invoke("auth:pollDeviceCode");
  },
  cancelDeviceCode(): Promise<void> {
    return ipcRenderer.invoke("auth:cancelDeviceCode");
  },
  sendMessage(input: SendMessageInput) {
    return ipcRenderer.invoke("chat:send", input);
  },
  stopGeneration(): Promise<void> {
    return ipcRenderer.invoke("chat:stop");
  },
  listSkills(): Promise<SapSkillDefinition[]> {
    return ipcRenderer.invoke("skills:list");
  },
  listSkillPacks(): Promise<SkillPackDefinition[]> {
    return ipcRenderer.invoke("skills:listPacks");
  },
  recommendSkills(context: SkillExecutionContext): Promise<SkillRecommendation[]> {
    return ipcRenderer.invoke("skills:recommend", context);
  },
  listSources(context: SkillExecutionContext): Promise<SapSourceDefinition[]> {
    return ipcRenderer.invoke("sources:list", context);
  },
  searchSources(query: string, context: SkillExecutionContext): Promise<SapSourceDefinition[]> {
    return ipcRenderer.invoke("sources:search", query, context);
  },
  listConfiguredSources(): Promise<ConfiguredSource[]> {
    return ipcRenderer.invoke("sources:listConfigured");
  },
  pickAndAddLocalFolderSource(input: PickAndAddLocalFolderSourceInput) {
    return ipcRenderer.invoke("sources:pickAndAddLocalFolder", input);
  },
  reindexSource(sourceId: string) {
    return ipcRenderer.invoke("sources:reindex", sourceId);
  },
  searchSourceDocuments(input: SourceDocumentSearchInput): Promise<SourceDocument[]> {
    return ipcRenderer.invoke("sources:searchDocuments", input);
  },
  getSourceDocument(documentId: string): Promise<SourceDocument | null> {
    return ipcRenderer.invoke("sources:getDocument", documentId);
  },
  listSessions(limit = 50) {
    return ipcRenderer.invoke("sessions:list", limit);
  },
  getSessionMessages(sessionId: string, limit = 100) {
    return ipcRenderer.invoke("sessions:messages", sessionId, limit);
  },
  analyzeCboText(input: CboAnalyzeTextInput) {
    return ipcRenderer.invoke("cbo:analyzeText", input);
  },
  analyzeCboFile(input: CboAnalyzeFileInput) {
    return ipcRenderer.invoke("cbo:analyzeFile", input);
  },
  analyzeCboFolder(input: CboAnalyzeFolderInput) {
    return ipcRenderer.invoke("cbo:analyzeFolder", input);
  },
  pickAndAnalyzeCboFile(input?: CboAnalyzePickInput) {
    return ipcRenderer.invoke("cbo:pickAndAnalyzeFile", input);
  },
  pickAndAnalyzeCboFolder(input?: CboAnalyzeFolderPickInput) {
    return ipcRenderer.invoke("cbo:pickAndAnalyzeFolder", input);
  },
  listCboRuns(limit = 20) {
    return ipcRenderer.invoke("cbo:runs:list", limit);
  },
  getCboRunDetail(runId: string, limitFiles = 500) {
    return ipcRenderer.invoke("cbo:runs:detail", runId, limitFiles);
  },
  syncCboRunKnowledge(input: CboSyncKnowledgeInput) {
    return ipcRenderer.invoke("cbo:runs:syncKnowledge", input);
  },
  diffCboRuns(input: CboRunDiffInput) {
    return ipcRenderer.invoke("cbo:runs:diff", input);
  },
  cancelCboFolder() {
    return ipcRenderer.invoke("cbo:cancelFolder");
  },
  onCboProgress(callback: (event: CboBatchProgressEvent) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: CboBatchProgressEvent) =>
      callback(data);
    ipcRenderer.on("cbo:progress", handler);
    return () => {
      ipcRenderer.removeListener("cbo:progress", handler);
    };
  },
  listAuditLogs(limit = 50) {
    return ipcRenderer.invoke("audit:list", limit);
  },
  searchAuditLogs(filters: AuditSearchFilters) {
    return ipcRenderer.invoke("audit:search", filters);
  },
  listVaultEntries(limit = 50) {
    return ipcRenderer.invoke("vault:list", limit);
  },
  searchVaultByClassification(classification: VaultClassification, query?: string, limit?: number) {
    return ipcRenderer.invoke("vault:searchByClassification", classification, query, limit);
  },
  listVaultByDomainPack(pack: DomainPack, limit?: number) {
    return ipcRenderer.invoke("vault:listByDomainPack", pack, limit);
  },

  // ─── MCP API ───

  mcpConnect(config: McpServerConfigInput): Promise<{ connected: boolean; name: string }> {
    return ipcRenderer.invoke("mcp:connect", config);
  },
  mcpDisconnect(serverName: string): Promise<{ disconnected: boolean }> {
    return ipcRenderer.invoke("mcp:disconnect", serverName);
  },
  mcpListServers(): Promise<string[]> {
    return ipcRenderer.invoke("mcp:listServers");
  },
  mcpListResources(serverName: string): Promise<McpResourceInfo[]> {
    return ipcRenderer.invoke("mcp:listResources", serverName);
  },
  mcpAddSource(
    serverName: string,
    input: { title?: string; domainPack: DomainPack; classificationDefault: VaultClassification }
  ): Promise<{ source: ConfiguredSource; summary: SourceIndexSummary }> {
    return ipcRenderer.invoke("mcp:addSource", serverName, input);
  },
  mcpSyncSource(sourceId: string): Promise<{ source: ConfiguredSource | null; summary: SourceIndexSummary }> {
    return ipcRenderer.invoke("mcp:syncSource", sourceId);
  },

  // ─── Archive (소스코드 아카이브) API ───

  archivePickFolder(): Promise<{ canceled: boolean; path: string | null }> {
    return ipcRenderer.invoke("archive:pickFolder");
  },
  archiveListContents(input: ListArchiveContentsInput): Promise<ArchiveTreeNode[]> {
    return ipcRenderer.invoke("archive:listContents", input);
  },
  archiveReadFile(input: ReadArchiveFileInput): Promise<{ content: string; size: number }> {
    return ipcRenderer.invoke("archive:readFile", input);
  },
  archiveSaveFile(input: SaveArchiveFileInput): Promise<{ success: boolean; error?: string }> {
    return ipcRenderer.invoke("archive:saveFile", input);
  },

  // ─── Cockpit: 세션 API (Ask SAP 등에서 사용) ───

  listSessionsFiltered(filter: SessionFilter, limit = 50): Promise<ChatSessionMeta[]> {
    return ipcRenderer.invoke("sessions:listFiltered", filter, limit);
  },
  updateSessionTodoState(sessionId: string, state: TodoStateKind): Promise<void> {
    return ipcRenderer.invoke("sessions:updateTodoState", sessionId, state);
  },
  toggleSessionFlag(sessionId: string): Promise<void> {
    return ipcRenderer.invoke("sessions:toggleFlag", sessionId);
  },
  toggleSessionArchive(sessionId: string): Promise<void> {
    return ipcRenderer.invoke("sessions:toggleArchive", sessionId);
  },
  addSessionLabel(sessionId: string, label: SapLabel): Promise<void> {
    return ipcRenderer.invoke("sessions:addLabel", sessionId, label);
  },
  removeSessionLabel(sessionId: string, label: SapLabel): Promise<void> {
    return ipcRenderer.invoke("sessions:removeLabel", sessionId, label);
  },
  getSessionStats(): Promise<CockpitStats> {
    return ipcRenderer.invoke("sessions:stats");
  },

  // ─── Closing (마감 관리) API ───

  listPlans(limit?: number) {
    return ipcRenderer.invoke("cockpit:plans:list", limit);
  },
  getPlan(planId: string) {
    return ipcRenderer.invoke("cockpit:plans:get", planId);
  },
  createPlan(input: ClosingPlanInput) {
    return ipcRenderer.invoke("cockpit:plans:create", input);
  },
  updatePlan(planId: string, update: ClosingPlanUpdate) {
    return ipcRenderer.invoke("cockpit:plans:update", { planId, update });
  },
  deletePlan(planId: string) {
    return ipcRenderer.invoke("cockpit:plans:delete", planId);
  },
  listPlansByStatus(status: PlanStatus) {
    return ipcRenderer.invoke("cockpit:plans:listByStatus", status);
  },
  listOverduePlans() {
    return ipcRenderer.invoke("cockpit:plans:listOverdue");
  },
  listSteps(planId: string) {
    return ipcRenderer.invoke("cockpit:steps:list", planId);
  },
  createStep(input: ClosingStepInput) {
    return ipcRenderer.invoke("cockpit:steps:create", input);
  },
  updateStep(stepId: string, update: ClosingStepUpdate) {
    return ipcRenderer.invoke("cockpit:steps:update", { stepId, update });
  },
  deleteStep(stepId: string) {
    return ipcRenderer.invoke("cockpit:steps:delete", stepId);
  },
  reorderSteps(planId: string, stepIds: string[]) {
    return ipcRenderer.invoke("cockpit:steps:reorder", { planId, stepIds });
  },
  getClosingStats() {
    return ipcRenderer.invoke("cockpit:stats");
  },

  // ─── Routine (루틴 업무 자동화) API ───

  listRoutineTemplates(): Promise<RoutineTemplate[]> {
    return ipcRenderer.invoke("routine:templates:list");
  },
  listRoutineTemplatesByFrequency(frequency: RoutineFrequency): Promise<RoutineTemplate[]> {
    return ipcRenderer.invoke("routine:templates:listByFrequency", frequency);
  },
  getRoutineTemplate(id: string): Promise<{ template: RoutineTemplate; steps: RoutineTemplateStep[] } | null> {
    return ipcRenderer.invoke("routine:templates:get", id);
  },
  createRoutineTemplate(input: RoutineTemplateInput): Promise<RoutineTemplate> {
    return ipcRenderer.invoke("routine:templates:create", input);
  },
  updateRoutineTemplate(id: string, patch: RoutineTemplateUpdate): Promise<RoutineTemplate | null> {
    return ipcRenderer.invoke("routine:templates:update", { id, patch });
  },
  deleteRoutineTemplate(id: string): Promise<boolean> {
    return ipcRenderer.invoke("routine:templates:delete", id);
  },
  toggleRoutineTemplate(id: string): Promise<RoutineTemplate | null> {
    return ipcRenderer.invoke("routine:templates:toggle", id);
  },
  executeRoutinesNow(): Promise<{ created: number; skipped: number }> {
    return ipcRenderer.invoke("routine:execute:now");
  },
  listRoutineExecutions(date?: string): Promise<RoutineExecution[]> {
    return ipcRenderer.invoke("routine:executions:list", date);
  },
  getRoutineExecutionPlanIds(date: string): Promise<string[]> {
    return ipcRenderer.invoke("routine:executions:planIds", date);
  },
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
