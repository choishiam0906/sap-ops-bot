import { randomUUID } from "node:crypto";

import type { RoutineExecution } from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface ExecutionRow {
  id: string;
  templateId: string;
  planId: string;
  executionDate: string;
  createdAt: string;
}

function toExecution(row: ExecutionRow): RoutineExecution {
  return {
    id: row.id,
    templateId: row.templateId,
    planId: row.planId,
    executionDate: row.executionDate,
    createdAt: row.createdAt,
  };
}

export class RoutineExecutionRepository {
  constructor(private readonly db: LocalDatabase) {}

  /** 특정 템플릿+날짜 조합이 이미 실행되었는지 확인 */
  hasExecution(templateId: string, executionDate: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM routine_executions
         WHERE template_id = ? AND execution_date = ?`
      )
      .get(templateId, executionDate);
    return !!row;
  }

  /** 실행 기록 생성 */
  create(templateId: string, planId: string, executionDate: string): RoutineExecution {
    const now = nowIso();
    const execution: RoutineExecution = {
      id: randomUUID(),
      templateId,
      planId,
      executionDate,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO routine_executions(id, template_id, plan_id, execution_date, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(execution.id, execution.templateId, execution.planId, execution.executionDate, execution.createdAt);
    return execution;
  }

  /** 날짜별 실행 이력 조회 */
  listByDate(executionDate?: string): RoutineExecution[] {
    if (executionDate) {
      const rows = this.db
        .prepare(
          `SELECT id, template_id AS templateId, plan_id AS planId,
                  execution_date AS executionDate, created_at AS createdAt
           FROM routine_executions
           WHERE execution_date = ?
           ORDER BY created_at DESC`
        )
        .all(executionDate) as ExecutionRow[];
      return rows.map(toExecution);
    }

    const rows = this.db
      .prepare(
        `SELECT id, template_id AS templateId, plan_id AS planId,
                execution_date AS executionDate, created_at AS createdAt
         FROM routine_executions
         ORDER BY execution_date DESC, created_at DESC
         LIMIT 100`
      )
      .all() as ExecutionRow[];
    return rows.map(toExecution);
  }

  /** 특정 날짜에 생성된 Plan ID 목록 조회 */
  getPlanIdsByDate(executionDate: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT plan_id AS planId FROM routine_executions
         WHERE execution_date = ?`
      )
      .all(executionDate) as { planId: string }[];
    return rows.map((r) => r.planId);
  }
}
