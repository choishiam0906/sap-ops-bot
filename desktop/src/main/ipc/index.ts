import type { IpcContext } from "./types.js";
import { registerAuthHandlers } from "./authHandlers.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { registerCboHandlers } from "./cboHandlers.js";
import { registerSourceHandlers } from "./sourceHandlers.js";
import { registerAuditHandlers } from "./auditHandlers.js";
import { registerClosingHandlers } from "./closingHandlers.js";
import { registerRoutineHandlers } from "./routineHandlers.js";
import { registerArchiveHandlers } from "./archiveHandlers.js";
import { registerAgentHandlers } from "./agentHandlers.js";
import { registerScheduleHandlers } from "./scheduleHandlers.js";

export type { IpcContext } from "./types.js";

export function registerAllIpcHandlers(ctx: IpcContext): void {
  registerAuthHandlers(ctx);
  registerChatHandlers(ctx);
  registerCboHandlers(ctx);
  registerSourceHandlers(ctx);
  registerAuditHandlers(ctx);
  registerClosingHandlers(ctx);
  registerRoutineHandlers(ctx);
  registerArchiveHandlers(ctx);
  registerAgentHandlers(ctx);
  registerScheduleHandlers(ctx);
}
