import { ipcMain } from "electron";
import type {
  SapLabel,
  SendMessageInput,
  SessionFilter,
  TodoStateKind,
} from "../contracts.js";
import type { IpcContext } from "./types.js";

export function registerChatHandlers(ctx: IpcContext): void {
  ipcMain.handle("chat:send", async (_event, input: SendMessageInput) => {
    return ctx.chatRuntime.sendMessage(input);
  });

  ipcMain.handle("sessions:list", async (_event, limit = 50) => {
    return ctx.chatRuntime.listSessions(limit);
  });

  ipcMain.handle(
    "sessions:messages",
    async (_event, sessionId: string, limit = 100) => {
      return ctx.chatRuntime.getMessages(sessionId, limit);
    }
  );

  // ─── Cockpit IPC ───

  ipcMain.handle("sessions:listFiltered", (_event, filter: SessionFilter, limit?: number) =>
    ctx.sessionRepo.listFiltered(filter, limit));

  ipcMain.handle("sessions:updateTodoState", (_event, sessionId: string, state: TodoStateKind) =>
    ctx.sessionRepo.updateTodoState(sessionId, state));

  ipcMain.handle("sessions:toggleFlag", (_event, sessionId: string) =>
    ctx.sessionRepo.toggleFlag(sessionId));

  ipcMain.handle("sessions:toggleArchive", (_event, sessionId: string) =>
    ctx.sessionRepo.toggleArchive(sessionId));

  ipcMain.handle("sessions:addLabel", (_event, sessionId: string, label: SapLabel) =>
    ctx.sessionRepo.addLabel(sessionId, label));

  ipcMain.handle("sessions:removeLabel", (_event, sessionId: string, label: SapLabel) =>
    ctx.sessionRepo.removeLabel(sessionId, label));

  ipcMain.handle("sessions:stats", () =>
    ctx.sessionRepo.getStats());
}
