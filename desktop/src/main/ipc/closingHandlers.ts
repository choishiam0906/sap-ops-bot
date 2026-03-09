import { ipcMain } from "electron";

import type {
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStepInput,
  ClosingStepUpdate,
  PlanStatus,
} from "../contracts.js";
import type { IpcContext } from "./types.js";

export function registerClosingHandlers(ctx: IpcContext): void {
  // ─── Plan CRUD ───

  ipcMain.handle("cockpit:plans:list", (_e, limit?: number) => {
    return ctx.closingPlanRepo.list(limit);
  });

  ipcMain.handle("cockpit:plans:get", (_e, planId: string) => {
    return ctx.closingPlanRepo.getById(planId);
  });

  ipcMain.handle("cockpit:plans:create", (_e, input: ClosingPlanInput) => {
    return ctx.closingPlanRepo.create(input);
  });

  ipcMain.handle("cockpit:plans:update", (_e, payload: { planId: string; update: ClosingPlanUpdate }) => {
    return ctx.closingPlanRepo.update(payload.planId, payload.update);
  });

  ipcMain.handle("cockpit:plans:delete", (_e, planId: string) => {
    return ctx.closingPlanRepo.delete(planId);
  });

  ipcMain.handle("cockpit:plans:listOverdue", () => {
    return ctx.closingPlanRepo.listOverdue();
  });

  ipcMain.handle("cockpit:plans:listByStatus", (_e, status: PlanStatus) => {
    return ctx.closingPlanRepo.listByStatus(status);
  });

  // ─── Step CRUD ───

  ipcMain.handle("cockpit:steps:list", (_e, planId: string) => {
    return ctx.closingStepRepo.listByPlan(planId);
  });

  ipcMain.handle("cockpit:steps:create", (_e, input: ClosingStepInput) => {
    const step = ctx.closingStepRepo.create(input);
    ctx.closingPlanRepo.recalcProgress(input.planId);
    return step;
  });

  ipcMain.handle("cockpit:steps:update", (_e, payload: { stepId: string; update: ClosingStepUpdate }) => {
    const step = ctx.closingStepRepo.update(payload.stepId, payload.update);
    if (step) {
      ctx.closingPlanRepo.recalcProgress(step.planId);
    }
    return step;
  });

  ipcMain.handle("cockpit:steps:delete", (_e, stepId: string) => {
    const { deleted, planId } = ctx.closingStepRepo.delete(stepId);
    if (deleted && planId) {
      ctx.closingPlanRepo.recalcProgress(planId);
    }
    return deleted;
  });

  ipcMain.handle("cockpit:steps:reorder", (_e, payload: { planId: string; stepIds: string[] }) => {
    ctx.closingStepRepo.reorder(payload.planId, payload.stepIds);
  });

  // ─── Stats ───

  ipcMain.handle("cockpit:stats", () => {
    return ctx.closingPlanRepo.getStats();
  });
}
