import type { Migration } from "../migrationRunner.js";

/**
 * 002: v5.0 스케줄 자동 실행 테이블.
 * cron 기반 스케줄 작업과 실행 로그를 관리한다.
 */
export const migration002: Migration = {
  version: 2,
  name: "v5_schedule",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES routine_templates(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS schedule_execution_logs (
        id TEXT PRIMARY KEY,
        scheduled_task_id TEXT NOT NULL,
        status TEXT NOT NULL,
        result_json TEXT,
        error_message TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        FOREIGN KEY (scheduled_task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled
      ON scheduled_tasks (enabled);

      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_template
      ON scheduled_tasks (template_id);

      CREATE INDEX IF NOT EXISTS idx_schedule_logs_task
      ON schedule_execution_logs (scheduled_task_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_schedule_logs_status
      ON schedule_execution_logs (status, started_at DESC);
    `);
  },
};
