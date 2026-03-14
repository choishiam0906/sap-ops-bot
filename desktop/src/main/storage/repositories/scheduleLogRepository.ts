import { randomUUID } from "node:crypto";
import type { LocalDatabase } from "../sqlite.js";

export interface ScheduleLogRow {
  id: string;
  scheduledTaskId: string;
  status: "success" | "failed" | "skipped";
  resultJson: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export class ScheduleLogRepository {
  constructor(private readonly db: LocalDatabase) {}

  create(
    scheduledTaskId: string,
    status: ScheduleLogRow["status"],
    startedAt: string,
    finishedAt?: string,
    resultJson?: string,
    errorMessage?: string,
  ): ScheduleLogRow {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO schedule_execution_logs
         (id, scheduled_task_id, status, result_json, error_message, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, scheduledTaskId, status, resultJson ?? null, errorMessage ?? null, startedAt, finishedAt ?? null);
    return this.getById(id)!;
  }

  getById(id: string): ScheduleLogRow | null {
    const row = this.db
      .prepare("SELECT * FROM schedule_execution_logs WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  listByTask(scheduledTaskId: string, limit = 20): ScheduleLogRow[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM schedule_execution_logs WHERE scheduled_task_id = ? ORDER BY started_at DESC LIMIT ?"
      )
      .all(scheduledTaskId, limit) as Record<string, unknown>[];
    return rows.map(this.mapRow);
  }

  listRecent(limit = 50): ScheduleLogRow[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM schedule_execution_logs ORDER BY started_at DESC LIMIT ?"
      )
      .all(limit) as Record<string, unknown>[];
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): ScheduleLogRow {
    return {
      id: row.id as string,
      scheduledTaskId: row.scheduled_task_id as string,
      status: row.status as ScheduleLogRow["status"],
      resultJson: (row.result_json as string) || null,
      errorMessage: (row.error_message as string) || null,
      startedAt: row.started_at as string,
      finishedAt: (row.finished_at as string) || null,
    };
  }
}
