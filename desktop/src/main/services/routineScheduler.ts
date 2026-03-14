import cron, { type ScheduledTask as CronJob } from "node-cron";
import type { BrowserWindow } from "electron";
import type { ScheduledTaskRepository, ScheduledTaskRow } from "../storage/repositories/scheduledTaskRepository.js";
import type { ScheduleLogRepository } from "../storage/repositories/scheduleLogRepository.js";
import type { RoutineExecutor } from "./routineExecutor.js";
import { logger } from "../logger.js";

/**
 * cron 기반 스케줄 서비스.
 * 앱 시작 시 DB의 활성 스케줄을 로드하고, cron job으로 등록한다.
 * 실행 결과는 DB 로그에 저장하고 IPC로 Renderer에 전송한다.
 */
export class RoutineScheduler {
  private readonly jobs = new Map<string, CronJob>();

  constructor(
    private readonly scheduledTaskRepo: ScheduledTaskRepository,
    private readonly scheduleLogRepo: ScheduleLogRepository,
    private readonly routineExecutor: RoutineExecutor,
    private readonly getMainWindow: () => BrowserWindow | null,
  ) {}

  /** 앱 시작 시: DB에서 활성 스케줄 로드 → cron 등록 */
  startAll(): void {
    const tasks = this.scheduledTaskRepo.listEnabled();
    for (const task of tasks) {
      this.schedule(task);
    }
    logger.info({ count: tasks.length }, "스케줄 자동 실행 초기화");
  }

  /** 개별 스케줄 등록 */
  schedule(task: ScheduledTaskRow): void {
    // 기존 job이 있으면 제거
    this.unschedule(task.id);

    if (!cron.validate(task.cronExpression)) {
      logger.warn({ taskId: task.id, cron: task.cronExpression }, "잘못된 cron 표현식");
      return;
    }

    const job = cron.schedule(task.cronExpression, () => {
      void this.executeAndNotify(task);
    });

    this.jobs.set(task.id, job);
  }

  /** 개별 스케줄 해제 */
  unschedule(taskId: string): void {
    const existing = this.jobs.get(taskId);
    if (existing) {
      existing.stop();
      this.jobs.delete(taskId);
    }
  }

  /** 수동 즉시 실행 */
  async executeNow(taskId: string): Promise<void> {
    const task = this.scheduledTaskRepo.getById(taskId);
    if (!task) {
      throw new Error(`스케줄 ${taskId}를 찾을 수 없어요.`);
    }
    await this.executeAndNotify(task);
  }

  /** 실행 결과를 IPC로 Renderer에 전송 + DB 로그 저장 */
  private async executeAndNotify(task: ScheduledTaskRow): Promise<void> {
    const startedAt = new Date().toISOString();
    let status: "success" | "failed" = "success";
    let errorMessage: string | undefined;
    let resultJson: string | undefined;

    try {
      const result = this.routineExecutor.executeDueRoutines();
      resultJson = JSON.stringify(result);

      // 실행 타임스탬프 업데이트
      this.scheduledTaskRepo.updateRunTimestamps(
        task.id,
        startedAt,
        null, // next_run_at는 cron 라이브러리가 관리
      );
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ taskId: task.id, error: errorMessage }, "스케줄 실행 실패");
    }

    const finishedAt = new Date().toISOString();

    // DB 로그 저장
    this.scheduleLogRepo.create(
      task.id,
      status,
      startedAt,
      finishedAt,
      resultJson,
      errorMessage,
    );

    // Renderer에 알림
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("schedule:execution-complete", {
        taskId: task.id,
        status,
        startedAt,
        finishedAt,
        resultJson,
        errorMessage,
      });
    }
  }

  /** 앱 종료 시 모든 cron job 정리 */
  stopAll(): void {
    for (const [, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    logger.info("스케줄 자동 실행 종료");
  }
}
