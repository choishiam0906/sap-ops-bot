import { ipcMain } from "electron";

import { wrapHandler } from "./wrapHandler.js";

type AnyFn = (...args: never[]) => unknown;

/**
 * 순수 CRUD 패스쓰루 핸들러를 일괄 등록한다.
 * 각 매핑은 IPC 채널명 → 핸들러 함수 쌍이다.
 *
 * @example
 * registerCrudHandlers({
 *   "cockpit:plans:list": (limit?: number) => repo.list(limit),
 *   "cockpit:plans:get": (id: string) => repo.getById(id),
 * });
 */
export function registerCrudHandlers(
  mappings: Record<string, AnyFn>,
): void {
  for (const [channel, handler] of Object.entries(mappings)) {
    const wrapped = wrapHandler(channel, handler as (...args: unknown[]) => unknown);
    ipcMain.handle(channel, (_e, ...args: unknown[]) => wrapped(...args));
  }
}
