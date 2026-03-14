import { ipcMain } from "electron";

import type {
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStepInput,
  ClosingStepUpdate,
  PlanStatus,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";

export function registerClosingHandlers(ctx: IpcContext): void {
  // ─── Plan CRUD (순수 패스쓰루) ───
  registerCrudHandlers({
    "cockpit:plans:list": (limit?: number) => ctx.closingPlanRepo.list(limit),
    "cockpit:plans:get": (planId: string) => ctx.closingPlanRepo.getById(planId),
    "cockpit:plans:create": (input: ClosingPlanInput) => ctx.closingPlanRepo.create(input),
    "cockpit:plans:update": (payload: { planId: string; update: ClosingPlanUpdate }) =>
      ctx.closingPlanRepo.update(payload.planId, payload.update),
    "cockpit:plans:delete": (planId: string) => ctx.closingPlanRepo.delete(planId),
    "cockpit:plans:listOverdue": () => ctx.closingPlanRepo.listOverdue(),
    "cockpit:plans:listByStatus": (status: PlanStatus) => ctx.closingPlanRepo.listByStatus(status),
    "cockpit:stats": () => ctx.closingPlanRepo.getStats(),
    "cockpit:steps:list": (planId: string) => ctx.closingStepRepo.listByPlan(planId),
    "cockpit:steps:reorder": (payload: { planId: string; stepIds: string[] }) =>
      ctx.closingStepRepo.reorder(payload.planId, payload.stepIds),
  });

  // ─── Step 사이드 이펙트 핸들러 (recalcProgress) ───
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
}
