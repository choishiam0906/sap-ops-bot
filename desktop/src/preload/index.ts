import { contextBridge, ipcRenderer } from "electron";

import {
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  OAuthCompleteInput,
  ProviderType,
  SendMessageInput,
} from "../main/contracts.js";

const desktopApi = {
  startOAuth(provider: ProviderType) {
    return ipcRenderer.invoke("auth:start", provider);
  },
  completeOAuth(input: OAuthCompleteInput) {
    return ipcRenderer.invoke("auth:complete", input);
  },
  getAuthStatus(provider: ProviderType) {
    return ipcRenderer.invoke("auth:status", provider);
  },
  logout(provider: ProviderType) {
    return ipcRenderer.invoke("auth:logout", provider);
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
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
