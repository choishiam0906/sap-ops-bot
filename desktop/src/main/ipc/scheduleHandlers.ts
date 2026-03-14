import { ipcMain } from "electron";
import type { IpcContext } from "./types.js";
import type { ScheduledTaskInput } from "../storage/repositories/scheduledTaskRepository.js";

export function registerScheduleHandlers(ctx: IpcContext): void {
  ipcMain.handle("schedule:list", () => {
    return ctx.scheduledTaskRepo.list();
  });

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

  ipcMain.handle("schedule:logs", (_event, taskId: string, limit?: number) => {
    return ctx.scheduleLogRepo.listByTask(taskId, limit);
  });

  ipcMain.handle("schedule:logs:recent", (_event, limit?: number) => {
    return ctx.scheduleLogRepo.listRecent(limit);
  });
}
