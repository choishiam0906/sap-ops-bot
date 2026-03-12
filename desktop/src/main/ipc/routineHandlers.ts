import { ipcMain } from "electron";

import type {
  RoutineKnowledgeLinkInput,
  RoutineTemplateInput,
  RoutineTemplateUpdate,
  RoutineFrequency,
} from "../contracts.js";
import type { IpcContext } from "./types.js";

export function registerRoutineHandlers(ctx: IpcContext): void {
  // ─── Template CRUD ───

  ipcMain.handle("routine:templates:list", () => {
    return ctx.routineTemplateRepo.list();
  });

  ipcMain.handle("routine:templates:listByFrequency", (_e, frequency: RoutineFrequency) => {
    return ctx.routineTemplateRepo.listByFrequency(frequency, false);
  });

  ipcMain.handle("routine:templates:get", (_e, id: string) => {
    const template = ctx.routineTemplateRepo.getById(id);
    if (!template) return null;
    const steps = ctx.routineTemplateRepo.getSteps(id);
    return { template, steps };
  });

  ipcMain.handle("routine:templates:create", (_e, input: RoutineTemplateInput) => {
    return ctx.routineTemplateRepo.create(input);
  });

  ipcMain.handle("routine:templates:update", (_e, payload: { id: string; patch: RoutineTemplateUpdate }) => {
    return ctx.routineTemplateRepo.update(payload.id, payload.patch);
  });

  ipcMain.handle("routine:templates:delete", (_e, id: string) => {
    return ctx.routineTemplateRepo.delete(id);
  });

  ipcMain.handle("routine:templates:toggle", (_e, id: string) => {
    return ctx.routineTemplateRepo.toggle(id);
  });

  ipcMain.handle("routine:knowledge:list", (_e, templateId: string) => {
    return ctx.routineKnowledgeLinkRepo.listByTemplateId(templateId);
  });

  ipcMain.handle("routine:knowledge:link", (_e, input: RoutineKnowledgeLinkInput) => {
    return ctx.routineKnowledgeLinkRepo.upsert(input);
  });

  ipcMain.handle("routine:knowledge:unlink", (_e, id: string) => {
    return ctx.routineKnowledgeLinkRepo.delete(id);
  });

  // ─── Execution ───

  ipcMain.handle("routine:execute:now", () => {
    return ctx.routineExecutor.executeDueRoutines();
  });

  ipcMain.handle("routine:executions:list", (_e, date?: string) => {
    return ctx.routineExecutionRepo.listByDate(date);
  });

  ipcMain.handle("routine:executions:planIds", (_e, date: string) => {
    return ctx.routineExecutionRepo.getPlanIdsByDate(date);
  });
}
