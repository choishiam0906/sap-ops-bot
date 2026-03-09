import { ipcMain } from "electron";
import type {
  AuditSearchFilters,
  DomainPack,
  VaultClassification,
} from "../contracts.js";
import type { IpcContext } from "./types.js";

export function registerAuditHandlers(ctx: IpcContext): void {
  ipcMain.handle("audit:list", async (_event, limit = 50) => {
    return ctx.auditRepo.list(limit);
  });

  ipcMain.handle("audit:search", async (_event, filters: AuditSearchFilters) => {
    return ctx.auditRepo.search(filters);
  });

  ipcMain.handle("vault:list", async (_event, limit = 50) => {
    return ctx.vaultRepo.list(limit);
  });

  ipcMain.handle(
    "vault:searchByClassification",
    async (_event, classification: VaultClassification, query?: string, limit?: number) => {
      return ctx.vaultRepo.searchByClassification(classification, query, limit);
    }
  );

  ipcMain.handle("vault:listByDomainPack", async (_event, pack: DomainPack, limit?: number) => {
    return ctx.vaultRepo.listByDomainPack(pack, limit);
  });
}
