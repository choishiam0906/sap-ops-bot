import { contextBridge, ipcRenderer } from "electron";

import type {
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
  ConfiguredSource,
  CockpitStats,
  DomainPack,
  PickAndAddLocalFolderSourceInput,
  ProviderType,
  SapLabel,
  SendMessageInput,
  SessionFilter,
  SetApiKeyInput,
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
  sendMessage(input: SendMessageInput) {
    return ipcRenderer.invoke("chat:send", input);
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

  // ─── Cockpit API ───

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
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
