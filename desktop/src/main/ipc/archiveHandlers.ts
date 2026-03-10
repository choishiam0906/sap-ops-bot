import { dialog, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ArchiveTreeNode,
  ListArchiveContentsInput,
  ReadArchiveFileInput,
  SaveArchiveFileInput,
} from "../types/archive.js";
import type { IpcContext } from "./types.js";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".abap", ".log"]);

function isTextFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function buildTree(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
): Promise<ArchiveTreeNode[]> {
  if (currentDepth > maxDepth) return [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: ArchiveTreeNode[] = [];

  // 폴더 먼저, 파일 나중 (각각 이름순)
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, currentDepth + 1, maxDepth);
      nodes.push({
        id: fullPath,
        name: entry.name,
        type: "folder",
        path: fullPath,
        children,
      });
    } else if (isTextFile(entry.name)) {
      const stat = await fs.stat(fullPath);
      nodes.push({
        id: fullPath,
        name: entry.name,
        type: "file",
        path: fullPath,
        size: stat.size,
      });
    }
  }

  return nodes;
}

export function registerArchiveHandlers(ctx: IpcContext): void {
  ipcMain.handle("archive:pickFolder", async () => {
    const mainWindow = ctx.getMainWindow();
    const selection = mainWindow
      ? await dialog.showOpenDialog(mainWindow, {
          title: "소스코드 아카이브 폴더 선택",
          properties: ["openDirectory"],
        })
      : await dialog.showOpenDialog({
          title: "소스코드 아카이브 폴더 선택",
          properties: ["openDirectory"],
        });

    if (selection.canceled || selection.filePaths.length === 0) {
      return { canceled: true, path: null };
    }

    return { canceled: false, path: selection.filePaths[0] };
  });

  ipcMain.handle(
    "archive:listContents",
    async (_event, input: ListArchiveContentsInput) => {
      const maxDepth = input.maxDepth ?? 3;
      return buildTree(input.folderPath, 1, maxDepth);
    },
  );

  ipcMain.handle(
    "archive:readFile",
    async (_event, input: ReadArchiveFileInput) => {
      const content = await fs.readFile(input.filePath, "utf-8");
      const stat = await fs.stat(input.filePath);
      return { content, size: stat.size };
    },
  );

  ipcMain.handle(
    "archive:saveFile",
    async (_event, input: SaveArchiveFileInput) => {
      try {
        // 상위 디렉토리가 없으면 생성
        await fs.mkdir(path.dirname(input.filePath), { recursive: true });
        await fs.writeFile(input.filePath, input.content, "utf-8");
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );
}
