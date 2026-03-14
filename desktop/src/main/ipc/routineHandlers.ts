import { ipcMain } from "electron";

import type {
  RoutineKnowledgeLinkInput,
  RoutineTemplateInput,
  RoutineTemplateUpdate,
  RoutineFrequency,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";

export function registerRoutineHandlers(ctx: IpcContext): void {
  // ─── 순수 패스쓰루 ───
  registerCrudHandlers({
    "routine:templates:list": () => ctx.routineTemplateRepo.list(),
    "routine:templates:listByFrequency": (frequency: RoutineFrequency) =>
      ctx.routineTemplateRepo.listByFrequency(frequency, false),
    "routine:templates:create": (input: RoutineTemplateInput) =>
      ctx.routineTemplateRepo.create(input),
    "routine:templates:update": (payload: { id: string; patch: RoutineTemplateUpdate }) =>
      ctx.routineTemplateRepo.update(payload.id, payload.patch),
    "routine:templates:delete": (id: string) => ctx.routineTemplateRepo.delete(id),
    "routine:templates:toggle": (id: string) => ctx.routineTemplateRepo.toggle(id),
    "routine:knowledge:list": (templateId: string) =>
      ctx.routineKnowledgeLinkRepo.listByTemplateId(templateId),
    "routine:knowledge:link": (input: RoutineKnowledgeLinkInput) =>
      ctx.routineKnowledgeLinkRepo.upsert(input),
    "routine:knowledge:unlink": (id: string) => ctx.routineKnowledgeLinkRepo.delete(id),
    "routine:execute:now": () => ctx.routineExecutor.executeDueRoutines(),
    "routine:executions:list": (date?: string) => ctx.routineExecutionRepo.listByDate(date),
    "routine:executions:planIds": (date: string) => ctx.routineExecutionRepo.getPlanIdsByDate(date),
  });

  // ─── 커스텀 로직 (template + steps 결합) ───
  ipcMain.handle("routine:templates:get", (_e, id: string) => {
    const template = ctx.routineTemplateRepo.getById(id);
    if (!template) return null;
    const steps = ctx.routineTemplateRepo.getSteps(id);
    return { template, steps };
  });
}
