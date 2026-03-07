import { contextBridge, ipcRenderer } from "electron";

import type {
  AuditSearchFilters,
  CboBatchProgressEvent,
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  DomainPack,
  ProviderType,
  SendMessageInput,
  SetApiKeyInput,
  VaultClassification,
  OAuthAvailability,
  OAuthInitResult,
  ProviderAccount,
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
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
