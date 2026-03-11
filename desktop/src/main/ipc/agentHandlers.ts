import { ipcMain, shell } from "electron";

import type { DomainPack } from "../contracts.js";
import type { AgentExecutionListOptions } from "../storage/repositories/agentExecutionRepository.js";
import { listAgentDefinitions, getAgentDefinition, listCustomAgentDefinitions } from "../agents/registry.js";
import { saveCustomAgent, deleteCustomAgent, getAgentFolderPath } from "../agents/agentLoaderService.js";
import type { IpcContext } from "./types.js";

export function registerAgentHandlers(ctx: IpcContext): void {
  ipcMain.handle("agents:list", (_e, domainPack?: DomainPack) => {
    return listAgentDefinitions(domainPack);
  });

  ipcMain.handle("agents:get", (_e, id: string) => {
    return getAgentDefinition(id);
  });

  ipcMain.handle("agents:execute", async (_e, agentId: string, domainPack: DomainPack) => {
    return ctx.agentExecutor.startExecution(agentId, domainPack);
  });

  ipcMain.handle("agents:execution:status", (_e, execId: string) => {
    return ctx.agentExecutor.getStatus(execId);
  });

  ipcMain.handle("agents:executions:list", (_e, opts?: AgentExecutionListOptions) => {
    return ctx.agentExecutionRepo.list(opts);
  });

  ipcMain.handle("agents:execution:cancel", async (_e, execId: string) => {
    return ctx.agentExecutor.cancelExecution(execId);
  });

  // ─── 커스텀 에이전트 CRUD ───

  ipcMain.handle("agents:listCustom", () => {
    return listCustomAgentDefinitions();
  });

  ipcMain.handle("agents:saveCustom", (_e, content: string, fileName: string) => {
    saveCustomAgent(content, fileName);
  });

  ipcMain.handle("agents:deleteCustom", (_e, fileName: string) => {
    deleteCustomAgent(fileName);
  });

  ipcMain.handle("agents:openFolder", async () => {
    await shell.openPath(getAgentFolderPath());
  });
}
