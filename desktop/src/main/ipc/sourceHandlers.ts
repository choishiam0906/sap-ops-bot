import { dialog, ipcMain, shell } from "electron";
import type {
  DomainPack,
  PickAndAddLocalFolderSourceInput,
  SkillExecutionContext,
  SourceDocumentSearchInput,
  VaultClassification,
} from "../contracts.js";
import type { McpServerConfig } from "../sources/mcpConnector.js";
import { listCustomSkillDefinitions } from "../skills/registry.js";
import { saveCustomSkill, deleteCustomSkill, getSkillFolderPath } from "../skills/skillLoaderService.js";
import type { IpcContext } from "./types.js";

export function registerSourceHandlers(ctx: IpcContext): void {
  ipcMain.handle("skills:list", async () => {
    return ctx.skillRegistry.listSkills();
  });

  ipcMain.handle("skills:listPacks", async () => {
    return ctx.skillRegistry.listPacks();
  });

  ipcMain.handle("skills:recommend", async (_event, context: SkillExecutionContext) => {
    return ctx.skillRegistry.recommendSkills(context);
  });

  ipcMain.handle("sources:list", async (_event, context: SkillExecutionContext) => {
    return ctx.skillRegistry.listSources(context);
  });

  ipcMain.handle("sources:search", async (_event, query: string, context: SkillExecutionContext) => {
    return ctx.skillRegistry.searchSources(query, context);
  });

  ipcMain.handle("sources:listConfigured", async () => {
    return ctx.configuredSourceRepo.list();
  });

  ipcMain.handle(
    "sources:pickAndAddLocalFolder",
    async (_event, input: PickAndAddLocalFolderSourceInput) => {
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          source: null,
          summary: null,
        };
      }

      const output = await ctx.localFolderLibrary.addLocalFolder(selection.filePaths[0], input);
      return {
        canceled: false,
        source: output.source,
        summary: output.summary,
      };
    }
  );

  ipcMain.handle("sources:reindex", async (_event, sourceId: string) => {
    const summary = await ctx.localFolderLibrary.reindexSource(sourceId);
    return {
      source: ctx.configuredSourceRepo.getById(sourceId),
      summary,
    };
  });

  ipcMain.handle("sources:searchDocuments", async (_event, input: SourceDocumentSearchInput) => {
    return ctx.localFolderLibrary.searchDocuments(input);
  });

  ipcMain.handle("sources:getDocument", async (_event, documentId: string) => {
    return ctx.sourceDocumentRepo.getById(documentId);
  });

  // ─── MCP IPC ───

  ipcMain.handle("mcp:connect", async (_event, config: McpServerConfig) => {
    await ctx.mcpConnector.connect(config);
    return { connected: true, name: config.name };
  });

  ipcMain.handle("mcp:disconnect", async (_event, serverName: string) => {
    await ctx.mcpConnector.disconnect(serverName);
    return { disconnected: true };
  });

  ipcMain.handle("mcp:listServers", async () => {
    return ctx.mcpConnector.listConnectedServers();
  });

  ipcMain.handle("mcp:listResources", async (_event, serverName: string) => {
    return ctx.mcpConnector.listResources(serverName);
  });

  ipcMain.handle(
    "mcp:addSource",
    async (_event, serverName: string, input: { title?: string; domainPack: DomainPack; classificationDefault: VaultClassification }) => {
      return ctx.mcpConnector.addSource(serverName, input);
    }
  );

  ipcMain.handle("mcp:syncSource", async (_event, sourceId: string) => {
    const summary = await ctx.mcpConnector.syncSource(sourceId);
    return {
      source: ctx.configuredSourceRepo.getById(sourceId),
      summary,
    };
  });

  // ─── 커스텀 스킬 CRUD ───

  ipcMain.handle("skills:listCustom", () => {
    return listCustomSkillDefinitions();
  });

  ipcMain.handle("skills:saveCustom", (_event, content: string, fileName: string) => {
    saveCustomSkill(content, fileName);
  });

  ipcMain.handle("skills:deleteCustom", (_event, fileName: string) => {
    deleteCustomSkill(fileName);
  });

  ipcMain.handle("skills:openFolder", async () => {
    await shell.openPath(getSkillFolderPath());
  });
}
