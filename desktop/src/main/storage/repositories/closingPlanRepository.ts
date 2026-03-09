import { randomUUID } from "node:crypto";

import type {
  ClosingPlan,
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStats,
  PlanStatus,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface PlanRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetDate: string;
  status: string;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

function toPlan(row: PlanRow): ClosingPlan {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type as ClosingPlan["type"],
    targetDate: row.targetDate,
    status: row.status as PlanStatus,
    progressPercent: row.progressPercent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ClosingPlanRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(limit = 100): ClosingPlan[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, description, type, target_date AS targetDate,
                status, progress_percent AS progressPercent,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_plans
         ORDER BY target_date ASC
         LIMIT ?`
      )
      .all(limit) as PlanRow[];
    return rows.map(toPlan);
  }

  listByStatus(status: PlanStatus, limit = 100): ClosingPlan[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, description, type, target_date AS targetDate,
                status, progress_percent AS progressPercent,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_plans
         WHERE status = ?
         ORDER BY target_date ASC
         LIMIT ?`
      )
      .all(status, limit) as PlanRow[];
    return rows.map(toPlan);
  }

  listOverdue(): ClosingPlan[] {
    const today = new Date().toISOString().slice(0, 10);
    const rows = this.db
      .prepare(
        `SELECT id, title, description, type, target_date AS targetDate,
                status, progress_percent AS progressPercent,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_plans
         WHERE target_date < ? AND status != 'completed'
         ORDER BY target_date ASC`
      )
      .all(today) as PlanRow[];
    return rows.map(toPlan);
  }

  getById(planId: string): ClosingPlan | null {
    const row = this.db
      .prepare(
        `SELECT id, title, description, type, target_date AS targetDate,
                status, progress_percent AS progressPercent,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_plans
         WHERE id = ?`
      )
      .get(planId) as PlanRow | undefined;
    return row ? toPlan(row) : null;
  }

  create(input: ClosingPlanInput): ClosingPlan {
    const now = nowIso();
    const plan: ClosingPlan = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      type: input.type,
      targetDate: input.targetDate,
      status: "in-progress",
      progressPercent: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO closing_plans(id, title, description, type, target_date, status, progress_percent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        plan.id,
        plan.title,
        plan.description ?? null,
        plan.type,
        plan.targetDate,
        plan.status,
        plan.progressPercent,
        plan.createdAt,
        plan.updatedAt
      );
    return plan;
  }

  update(planId: string, patch: ClosingPlanUpdate): ClosingPlan | null {
    const existing = this.getById(planId);
    if (!existing) return null;

    const now = nowIso();
    const updated: ClosingPlan = {
      ...existing,
      title: patch.title ?? existing.title,
      description: patch.description !== undefined ? patch.description : existing.description,
      type: patch.type ?? existing.type,
      targetDate: patch.targetDate ?? existing.targetDate,
      status: patch.status ?? existing.status,
      updatedAt: now,
    };

    this.db
      .prepare(
        `UPDATE closing_plans
         SET title = ?, description = ?, type = ?, target_date = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updated.title,
        updated.description ?? null,
        updated.type,
        updated.targetDate,
        updated.status,
        updated.updatedAt,
        planId
      );
    return updated;
  }

  delete(planId: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM closing_plans WHERE id = ?`)
      .run(planId);
    return result.changes > 0;
  }

  recalcProgress(planId: string): void {
    const row = this.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM closing_steps
         WHERE plan_id = ?`
      )
      .get(planId) as { total: number; completed: number };

    const percent = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
    const allDone = row.total > 0 && row.completed === row.total;

    this.db
      .prepare(
        `UPDATE closing_plans
         SET progress_percent = ?, status = CASE WHEN ? = 1 THEN 'completed' ELSE status END, updated_at = ?
         WHERE id = ?`
      )
      .run(percent, allDone ? 1 : 0, nowIso(), planId);
  }

  getStats(): ClosingStats {
    const today = new Date().toISOString().slice(0, 10);
    const imminent = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const row = this.db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM closing_plans) AS totalPlans,
          (SELECT COUNT(*) FROM closing_plans WHERE status = 'completed') AS completedPlans,
          (SELECT COUNT(*) FROM closing_plans WHERE status = 'delayed') AS delayedPlans,
          (SELECT COUNT(*) FROM closing_plans WHERE status = 'in-progress') AS inProgressPlans,
          (SELECT COUNT(*) FROM closing_steps) AS totalSteps,
          (SELECT COUNT(*) FROM closing_steps WHERE status = 'completed') AS completedSteps,
          (SELECT COUNT(*) FROM closing_steps WHERE deadline < ? AND status != 'completed') AS overdueSteps,
          (SELECT COUNT(*) FROM closing_steps WHERE deadline BETWEEN ? AND ? AND status != 'completed') AS imminentSteps`
      )
      .get(today, today, imminent) as ClosingStats;

    return row;
  }
}
