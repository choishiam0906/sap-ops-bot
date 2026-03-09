import type { IpcContext } from "./types.js";
import { registerAuthHandlers } from "./authHandlers.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { registerCboHandlers } from "./cboHandlers.js";
import { registerSourceHandlers } from "./sourceHandlers.js";
import { registerAuditHandlers } from "./auditHandlers.js";

export type { IpcContext } from "./types.js";

export function registerAllIpcHandlers(ctx: IpcContext): void {
  registerAuthHandlers(ctx);
  registerChatHandlers(ctx);
  registerCboHandlers(ctx);
  registerSourceHandlers(ctx);
  registerAuditHandlers(ctx);
}
