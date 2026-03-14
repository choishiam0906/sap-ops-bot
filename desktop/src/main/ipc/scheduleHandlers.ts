import { ipcMain } from "electron";
import type { IpcContext } from "./types.js";
import type { ScheduledTaskInput } from "../storage/repositories/scheduledTaskRepository.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";

export function registerScheduleHandlers(ctx: IpcContext): void {
  // ─── 순수 패스쓰루 ───
  registerCrudHandlers({
    "schedule:list": () => ctx.scheduledTaskRepo.list(),
    "schedule:logs": (taskId: string, limit?: number) => ctx.scheduleLogRepo.listByTask(taskId, limit),
    "schedule:logs:recent": (limit?: number) => ctx.scheduleLogRepo.listRecent(limit),
  });

  // ─── 사이드 이펙트 핸들러 (scheduler 연동) ───
  ipcMain.handle("schedule:create", (_event, input: ScheduledTaskInput) => {
    const task = ctx.scheduledTaskRepo.create(input);
    if (task.enabled) {
      ctx.routineScheduler.schedule(task);
    }
    return task;
  });

  ipcMain.handle("schedule:update", (_event, id: string, patch: { cronExpression?: string; enabled?: boolean }) => {
    const updated = ctx.scheduledTaskRepo.update(id, patch);
    if (updated) {
      if (updated.enabled) {
        ctx.routineScheduler.schedule(updated);
      } else {
        ctx.routineScheduler.unschedule(updated.id);
      }
    }
    return updated;
  });

  ipcMain.handle("schedule:delete", (_event, id: string) => {
    ctx.routineScheduler.unschedule(id);
    return ctx.scheduledTaskRepo.delete(id);
  });

  ipcMain.handle("schedule:execute-now", async (_event, id: string) => {
    await ctx.routineScheduler.executeNow(id);
  });
}
