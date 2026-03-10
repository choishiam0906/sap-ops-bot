import { randomUUID } from "node:crypto";

import type {
  RoutineTemplate,
  RoutineTemplateInput,
  RoutineTemplateStep,
  RoutineTemplateUpdate,
  RoutineFrequency,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface TemplateRow {
  id: string;
  frequency: string;
  name: string;
  description: string | null;
  triggerDay: number | null;
  triggerMonth: number | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface StepRow {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  module: string | null;
  sortOrder: number;
}

function toTemplate(row: TemplateRow): RoutineTemplate {
  return {
    id: row.id,
    frequency: row.frequency as RoutineFrequency,
    name: row.name,
    description: row.description ?? undefined,
    triggerDay: row.triggerDay ?? undefined,
    triggerMonth: row.triggerMonth ?? undefined,
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toStep(row: StepRow): RoutineTemplateStep {
  return {
    id: row.id,
    templateId: row.templateId,
    title: row.title,
    description: row.description ?? undefined,
    module: row.module ?? undefined,
    sortOrder: row.sortOrder,
  };
}

export class RoutineTemplateRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(): RoutineTemplate[] {
    const rows = this.db
      .prepare(
        `SELECT id, frequency, name, description,
                trigger_day AS triggerDay, trigger_month AS triggerMonth,
                is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
         FROM routine_templates
         ORDER BY frequency, name`
      )
      .all() as TemplateRow[];
    return rows.map(toTemplate);
  }

  listByFrequency(frequency: RoutineFrequency, activeOnly = true): RoutineTemplate[] {
    const sql = activeOnly
      ? `SELECT id, frequency, name, description,
                trigger_day AS triggerDay, trigger_month AS triggerMonth,
                is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
         FROM routine_templates
         WHERE frequency = ? AND is_active = 1
         ORDER BY name`
      : `SELECT id, frequency, name, description,
                trigger_day AS triggerDay, trigger_month AS triggerMonth,
                is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
         FROM routine_templates
         WHERE frequency = ?
         ORDER BY name`;
    const rows = this.db.prepare(sql).all(frequency) as TemplateRow[];
    return rows.map(toTemplate);
  }

  getById(id: string): RoutineTemplate | null {
    const row = this.db
      .prepare(
        `SELECT id, frequency, name, description,
                trigger_day AS triggerDay, trigger_month AS triggerMonth,
                is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
         FROM routine_templates
         WHERE id = ?`
      )
      .get(id) as TemplateRow | undefined;
    return row ? toTemplate(row) : null;
  }

  getSteps(templateId: string): RoutineTemplateStep[] {
    const rows = this.db
      .prepare(
        `SELECT id, template_id AS templateId, title, description, module,
                sort_order AS sortOrder
         FROM routine_template_steps
         WHERE template_id = ?
         ORDER BY sort_order`
      )
      .all(templateId) as StepRow[];
    return rows.map(toStep);
  }

  create(input: RoutineTemplateInput): RoutineTemplate {
    const now = nowIso();
    const templateId = randomUUID();

    const template: RoutineTemplate = {
      id: templateId,
      frequency: input.frequency,
      name: input.name,
      description: input.description,
      triggerDay: input.triggerDay,
      triggerMonth: input.triggerMonth,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const insertTemplate = this.db.prepare(
      `INSERT INTO routine_templates(id, frequency, name, description, trigger_day, trigger_month, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertStep = this.db.prepare(
      `INSERT INTO routine_template_steps(id, template_id, title, description, module, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const run = this.db.transaction(() => {
      insertTemplate.run(
        template.id,
        template.frequency,
        template.name,
        template.description ?? null,
        template.triggerDay ?? null,
        template.triggerMonth ?? null,
        1,
        template.createdAt,
        template.updatedAt
      );

      for (const step of input.steps) {
        insertStep.run(
          randomUUID(),
          templateId,
          step.title,
          step.description ?? null,
          step.module ?? null,
          step.sortOrder
        );
      }
    });
    run();

    return template;
  }

  update(id: string, patch: RoutineTemplateUpdate): RoutineTemplate | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = nowIso();
    const updated: RoutineTemplate = {
      ...existing,
      name: patch.name ?? existing.name,
      description: patch.description !== undefined ? patch.description : existing.description,
      triggerDay: patch.triggerDay !== undefined ? patch.triggerDay : existing.triggerDay,
      triggerMonth: patch.triggerMonth !== undefined ? patch.triggerMonth : existing.triggerMonth,
      isActive: patch.isActive !== undefined ? patch.isActive : existing.isActive,
      updatedAt: now,
    };

    this.db
      .prepare(
        `UPDATE routine_templates
         SET name = ?, description = ?, trigger_day = ?, trigger_month = ?,
             is_active = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updated.name,
        updated.description ?? null,
        updated.triggerDay ?? null,
        updated.triggerMonth ?? null,
        updated.isActive ? 1 : 0,
        updated.updatedAt,
        id
      );
    return updated;
  }

  toggle(id: string): RoutineTemplate | null {
    const existing = this.getById(id);
    if (!existing) return null;
    return this.update(id, { isActive: !existing.isActive });
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM routine_templates WHERE id = ?`)
      .run(id);
    return result.changes > 0;
  }

  count(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM routine_templates`)
      .get() as { cnt: number };
    return row.cnt;
  }
}
