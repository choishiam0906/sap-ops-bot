import { dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import type {
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
} from "../contracts.js";
import { parseCboFile } from "../cbo/parser.js";
import type { IpcContext } from "./types.js";

let folderAbortController: AbortController | null = null;

export function registerCboHandlers(ctx: IpcContext): void {
  ipcMain.handle("cbo:analyzeText", async (_event, input: CboAnalyzeTextInput) => {
    return ctx.cboAnalyzer.analyzeText(input);
  });

  ipcMain.handle("cbo:analyzeFile", async (_event, input: CboAnalyzeFileInput) => {
    return ctx.cboAnalyzer.analyzeFile(input);
  });

  ipcMain.handle("cbo:analyzeFolder", async (_event, input: CboAnalyzeFolderInput) => {
    folderAbortController = new AbortController();
    const mainWindow = ctx.getMainWindow();
    try {
      return await ctx.cboBatchRuntime.analyzeFolder(input, {
        signal: folderAbortController.signal,
        onProgress: (event) => mainWindow?.webContents.send("cbo:progress", event),
      });
    } finally {
      folderAbortController = null;
    }
  });

  ipcMain.handle("cbo:cancelFolder", () => {
    folderAbortController?.abort();
    folderAbortController = null;
  });

  ipcMain.handle(
    "cbo:pickAndAnalyzeFile",
    async (_event, input: CboAnalyzePickInput = {}) => {
      const dialogOptions: OpenDialogOptions = {
        title: "CBO 소스 파일 선택",
        properties: ["openFile"],
        filters: [{ name: "Text/Markdown", extensions: ["txt", "md"] }],
      };
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          filePath: null,
          result: null,
        };
      }

      const filePath = selection.filePaths[0];
      const parsed = await parseCboFile(filePath);
      const result = await ctx.cboAnalyzer.analyzeContent(
        parsed.fileName,
        parsed.content,
        input.provider,
        input.model
      );

      return {
        canceled: false,
        filePath,
        result,
        sourceContent: parsed.content,
      };
    }
  );

  ipcMain.handle(
    "cbo:pickAndAnalyzeFolder",
    async (_event, input: CboAnalyzeFolderPickInput = {}) => {
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          rootPath: null,
          output: null,
        };
      }

      const rootPath = selection.filePaths[0];
      folderAbortController = new AbortController();
      let output: Awaited<ReturnType<typeof ctx.cboBatchRuntime.analyzeFolder>>;
      try {
        output = await ctx.cboBatchRuntime.analyzeFolder(
          {
            rootPath,
            recursive: input.recursive,
            provider: input.provider,
            model: input.model,
            skipUnchanged: input.skipUnchanged,
            domainPack: input.domainPack,
          },
          {
            signal: folderAbortController.signal,
            onProgress: (event) => mainWindow?.webContents.send("cbo:progress", event),
          }
        );
      } finally {
        folderAbortController = null;
      }

      return {
        canceled: false,
        rootPath,
        output,
      };
    }
  );

  ipcMain.handle("cbo:runs:list", async (_event, limit = 20) => {
    return ctx.cboBatchRuntime.listRuns(limit);
  });

  ipcMain.handle(
    "cbo:runs:detail",
    async (_event, runId: string, limitFiles = 500) => {
      return ctx.cboBatchRuntime.getRunDetail(runId, limitFiles);
    }
  );

  ipcMain.handle(
    "cbo:runs:syncKnowledge",
    async (_event, input: CboSyncKnowledgeInput) => {
      return ctx.cboBatchRuntime.syncRunToKnowledge(input);
    }
  );

  ipcMain.handle("cbo:runs:diff", async (_event, input: CboRunDiffInput) => {
    return ctx.cboBatchRuntime.diffRuns(input);
  });
}
