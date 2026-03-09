import { randomUUID } from "node:crypto";

import type {
  ClosingStep,
  ClosingStepInput,
  ClosingStepUpdate,
  SapLabel,
  StepStatus,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface StepRow {
  id: string;
  planId: string;
  title: string;
  description: string | null;
  assignee: string | null;
  module: string | null;
  deadline: string;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function toStep(row: StepRow): ClosingStep {
  return {
    id: row.id,
    planId: row.planId,
    title: row.title,
    description: row.description ?? undefined,
    assignee: row.assignee ?? undefined,
    module: (row.module as SapLabel) ?? undefined,
    deadline: row.deadline,
    status: row.status as StepStatus,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ClosingStepRepository {
  constructor(private readonly db: LocalDatabase) {}

  listByPlan(planId: string): ClosingStep[] {
    const rows = this.db
      .prepare(
        `SELECT id, plan_id AS planId, title, description, assignee, module,
                deadline, status, sort_order AS sortOrder,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_steps
         WHERE plan_id = ?
         ORDER BY sort_order ASC`
      )
      .all(planId) as StepRow[];
    return rows.map(toStep);
  }

  getById(stepId: string): ClosingStep | null {
    const row = this.db
      .prepare(
        `SELECT id, plan_id AS planId, title, description, assignee, module,
                deadline, status, sort_order AS sortOrder,
                created_at AS createdAt, updated_at AS updatedAt
         FROM closing_steps
         WHERE id = ?`
      )
      .get(stepId) as StepRow | undefined;
    return row ? toStep(row) : null;
  }

  create(input: ClosingStepInput): ClosingStep {
    const now = nowIso();

    // 다음 sort_order 결정
    const maxRow = this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM closing_steps WHERE plan_id = ?`)
      .get(input.planId) as { maxOrder: number };

    const step: ClosingStep = {
      id: randomUUID(),
      planId: input.planId,
      title: input.title,
      description: input.description,
      assignee: input.assignee,
      module: input.module,
      deadline: input.deadline,
      status: "pending",
      sortOrder: maxRow.maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO closing_steps(id, plan_id, title, description, assignee, module, deadline, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        step.id,
        step.planId,
        step.title,
        step.description ?? null,
        step.assignee ?? null,
        step.module ?? null,
        step.deadline,
        step.status,
        step.sortOrder,
        step.createdAt,
        step.updatedAt
      );
    return step;
  }

  update(stepId: string, patch: ClosingStepUpdate): ClosingStep | null {
    const existing = this.getById(stepId);
    if (!existing) return null;

    const now = nowIso();
    const updated: ClosingStep = {
      ...existing,
      title: patch.title ?? existing.title,
      description: patch.description !== undefined ? patch.description : existing.description,
      assignee: patch.assignee !== undefined ? patch.assignee : existing.assignee,
      module: patch.module !== undefined ? patch.module : existing.module,
      deadline: patch.deadline ?? existing.deadline,
      status: patch.status ?? existing.status,
      updatedAt: now,
    };

    this.db
      .prepare(
        `UPDATE closing_steps
         SET title = ?, description = ?, assignee = ?, module = ?, deadline = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updated.title,
        updated.description ?? null,
        updated.assignee ?? null,
        updated.module ?? null,
        updated.deadline,
        updated.status,
        updated.updatedAt,
        stepId
      );
    return updated;
  }

  delete(stepId: string): { deleted: boolean; planId: string | null } {
    const step = this.getById(stepId);
    if (!step) return { deleted: false, planId: null };

    this.db.prepare(`DELETE FROM closing_steps WHERE id = ?`).run(stepId);
    return { deleted: true, planId: step.planId };
  }

  reorder(planId: string, stepIds: string[]): void {
    const update = this.db.prepare(
      `UPDATE closing_steps SET sort_order = ?, updated_at = ? WHERE id = ? AND plan_id = ?`
    );
    const now = nowIso();
    const run = this.db.transaction(() => {
      for (let i = 0; i < stepIds.length; i++) {
        update.run(i, now, stepIds[i], planId);
      }
    });
    run();
  }
}
