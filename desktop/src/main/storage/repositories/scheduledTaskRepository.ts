import { randomUUID } from "node:crypto";
import type { LocalDatabase } from "../sqlite.js";

export interface ScheduledTaskRow {
  id: string;
  templateId: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export interface ScheduledTaskInput {
  templateId: string;
  cronExpression: string;
  enabled?: boolean;
}

export class ScheduledTaskRepository {
  constructor(private readonly db: LocalDatabase) {}

  create(input: ScheduledTaskInput): ScheduledTaskRow {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO scheduled_tasks (id, template_id, cron_expression, enabled, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.templateId, input.cronExpression, input.enabled !== false ? 1 : 0, now);
    return this.getById(id)!;
  }

  getById(id: string): ScheduledTaskRow | null {
    const row = this.db
      .prepare("SELECT * FROM scheduled_tasks WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(): ScheduledTaskRow[] {
    const rows = this.db
      .prepare("SELECT * FROM scheduled_tasks ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(this.mapRow);
  }

  listEnabled(): ScheduledTaskRow[] {
    const rows = this.db
      .prepare("SELECT * FROM scheduled_tasks WHERE enabled = 1 ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(this.mapRow);
  }

  update(id: string, patch: Partial<Pick<ScheduledTaskRow, "cronExpression" | "enabled">>): ScheduledTaskRow | null {
    const current = this.getById(id);
    if (!current) return null;

    if (patch.cronExpression !== undefined) {
      this.db.prepare("UPDATE scheduled_tasks SET cron_expression = ? WHERE id = ?")
        .run(patch.cronExpression, id);
    }
    if (patch.enabled !== undefined) {
      this.db.prepare("UPDATE scheduled_tasks SET enabled = ? WHERE id = ?")
        .run(patch.enabled ? 1 : 0, id);
    }
    return this.getById(id);
  }

  updateRunTimestamps(id: string, lastRunAt: string, nextRunAt: string | null): void {
    this.db
      .prepare("UPDATE scheduled_tasks SET last_run_at = ?, next_run_at = ? WHERE id = ?")
      .run(lastRunAt, nextRunAt, id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private mapRow(row: Record<string, unknown>): ScheduledTaskRow {
    return {
      id: row.id as string,
      templateId: row.template_id as string,
      cronExpression: row.cron_expression as string,
      enabled: row.enabled === 1,
      lastRunAt: (row.last_run_at as string) || null,
      nextRunAt: (row.next_run_at as string) || null,
      createdAt: row.created_at as string,
    };
  }
}
