import { contextBridge, ipcRenderer } from "electron";

import type {
  AgentDefinition,
  AgentExecution,
  AgentExecutionSummary,
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
import type { AgentExecutionListOptions } from "../main/storage/repositories/agentExecutionRepository.js";

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
  streamMessage(input: SendMessageInput) {
    return ipcRenderer.invoke("chat:stream-message", input);
  },
  onStreamChunk(callback: (chunk: { delta: string; inputTokens?: number; outputTokens?: number }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { delta: string; inputTokens?: number; outputTokens?: number }) =>
      callback(data);
    ipcRenderer.on("chat:stream-chunk", handler);
    return () => { ipcRenderer.removeListener("chat:stream-chunk", handler); };
  },
  onStreamDone(callback: (data: { session: unknown; assistantMessage: unknown; meta: unknown }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { session: unknown; assistantMessage: unknown; meta: unknown }) =>
      callback(data);
    ipcRenderer.on("chat:stream-done", handler);
    return () => { ipcRenderer.removeListener("chat:stream-done", handler); };
  },
  onStreamError(callback: (data: { error: string }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { error: string }) =>
      callback(data);
    ipcRenderer.on("chat:stream-error", handler);
    return () => { ipcRenderer.removeListener("chat:stream-error", handler); };
  },
  setChatHistoryLimit(limit: number): Promise<void> {
    return ipcRenderer.invoke("chat:set-history-limit", limit);
  },
  getChatHistoryLimit(): Promise<number> {
    return ipcRenderer.invoke("chat:get-history-limit");
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

  // ─── Agent (스킬 조합 워크플로우) API ───

  listAgents(domainPack?: DomainPack): Promise<AgentDefinition[]> {
    return ipcRenderer.invoke("agents:list", domainPack);
  },
  getAgent(id: string): Promise<AgentDefinition | null> {
    return ipcRenderer.invoke("agents:get", id);
  },
  executeAgent(agentId: string, domainPack: DomainPack): Promise<string> {
    return ipcRenderer.invoke("agents:execute", agentId, domainPack);
  },
  getAgentExecution(execId: string): Promise<AgentExecution | null> {
    return ipcRenderer.invoke("agents:execution:status", execId);
  },
  listAgentExecutions(opts?: AgentExecutionListOptions): Promise<AgentExecutionSummary[]> {
    return ipcRenderer.invoke("agents:executions:list", opts);
  },
  cancelAgentExecution(execId: string): Promise<void> {
    return ipcRenderer.invoke("agents:execution:cancel", execId);
  },

  // ─── 커스텀 에이전트 CRUD ───

  listCustomAgents(): Promise<AgentDefinition[]> {
    return ipcRenderer.invoke("agents:listCustom");
  },
  saveCustomAgent(content: string, fileName: string): Promise<void> {
    return ipcRenderer.invoke("agents:saveCustom", content, fileName);
  },
  deleteCustomAgent(fileName: string): Promise<void> {
    return ipcRenderer.invoke("agents:deleteCustom", fileName);
  },
  openAgentFolder(): Promise<void> {
    return ipcRenderer.invoke("agents:openFolder");
  },

  // ─── Policy (정책 엔진) API ───

  listPolicyRules() {
    return ipcRenderer.invoke("policy:rules:list");
  },
  createPolicyRule(input: { name: string; description?: string; conditions: unknown[]; action: string; priority?: number }) {
    return ipcRenderer.invoke("policy:rules:create", input);
  },
  updatePolicyRule(id: string, patch: Record<string, unknown>) {
    return ipcRenderer.invoke("policy:rules:update", id, patch);
  },
  deletePolicyRule(id: string) {
    return ipcRenderer.invoke("policy:rules:delete", id);
  },
  evaluatePolicy(context: { action: string; provider?: string; domainPack?: string; skillId?: string; externalTransfer?: boolean }) {
    return ipcRenderer.invoke("policy:evaluate", context);
  },
  listPendingApprovals() {
    return ipcRenderer.invoke("policy:approvals:list");
  },
  decideApproval(requestId: string, approved: boolean) {
    return ipcRenderer.invoke("policy:approvals:decide", requestId, approved);
  },

  // ─── Schedule (스케줄 자동 실행) API ───

  listScheduledTasks() {
    return ipcRenderer.invoke("schedule:list");
  },
  createScheduledTask(input: { templateId: string; cronExpression: string; enabled?: boolean }) {
    return ipcRenderer.invoke("schedule:create", input);
  },
  updateScheduledTask(id: string, patch: { cronExpression?: string; enabled?: boolean }) {
    return ipcRenderer.invoke("schedule:update", id, patch);
  },
  deleteScheduledTask(id: string) {
    return ipcRenderer.invoke("schedule:delete", id);
  },
  executeScheduleNow(id: string) {
    return ipcRenderer.invoke("schedule:execute-now", id);
  },
  listScheduleLogs(taskId: string, limit?: number) {
    return ipcRenderer.invoke("schedule:logs", taskId, limit);
  },
  listRecentScheduleLogs(limit?: number) {
    return ipcRenderer.invoke("schedule:logs:recent", limit);
  },
  onScheduleExecutionComplete(callback: (data: unknown) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on("schedule:execution-complete", handler);
    return () => { ipcRenderer.removeListener("schedule:execution-complete", handler); };
  },

  // ─── 커스텀 스킬 CRUD ───

  listCustomSkills(): Promise<SapSkillDefinition[]> {
    return ipcRenderer.invoke("skills:listCustom");
  },
  saveCustomSkill(content: string, fileName: string): Promise<void> {
    return ipcRenderer.invoke("skills:saveCustom", content, fileName);
  },
  deleteCustomSkill(fileName: string): Promise<void> {
    return ipcRenderer.invoke("skills:deleteCustom", fileName);
  },
  openSkillFolder(): Promise<void> {
    return ipcRenderer.invoke("skills:openFolder");
  },
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
