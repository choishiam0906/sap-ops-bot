import { randomUUID } from "node:crypto";

import type {
  AgentExecution,
  AgentExecutionSummary,
  AgentStepResult,
  AgentExecutionStatus,
  AgentStepStatus,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

// ─── DB Row 타입 ───

interface ExecutionRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface StepResultRow {
  id: string;
  execution_id: string;
  step_id: string;
  skill_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  output_text: string | null;
  error: string | null;
}

interface SummaryRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  step_count: number;
  completed_steps: number;
}

// ─── 변환 함수 ───

function toStepResult(row: StepResultRow): AgentStepResult {
  return {
    stepId: row.step_id,
    skillId: row.skill_id,
    status: row.status as AgentStepStatus,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    output: row.output_text ?? undefined,
    error: row.error ?? undefined,
  };
}

// ─── Repository ───

export interface AgentExecutionListOptions {
  agentId?: string;
  status?: AgentExecutionStatus;
  limit?: number;
}

export class AgentExecutionRepository {
  constructor(private readonly db: LocalDatabase) {}

  create(agentId: string): AgentExecution {
    const now = nowIso();
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO agent_executions(id, agent_id, status, started_at, created_at)
         VALUES (?, ?, 'running', ?, ?)`
      )
      .run(id, agentId, now, now);
    return {
      id,
      agentId,
      status: "running",
      startedAt: now,
      stepResults: [],
    };
  }

  getById(executionId: string): AgentExecution | null {
    const row = this.db
      .prepare(
        `SELECT id, agent_id, status, started_at, completed_at, error_message
         FROM agent_executions WHERE id = ?`
      )
      .get(executionId) as ExecutionRow | undefined;
    if (!row) return null;

    const stepRows = this.db
      .prepare(
        `SELECT id, execution_id, step_id, skill_id, status,
                started_at, completed_at, output_text, error
         FROM agent_step_results WHERE execution_id = ?
         ORDER BY rowid`
      )
      .all(executionId) as StepResultRow[];

    return {
      id: row.id,
      agentId: row.agent_id,
      status: row.status as AgentExecutionStatus,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      errorMessage: row.error_message ?? undefined,
      stepResults: stepRows.map(toStepResult),
    };
  }

  list(opts?: AgentExecutionListOptions): AgentExecutionSummary[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts?.agentId) {
      conditions.push("e.agent_id = ?");
      params.push(opts.agentId);
    }
    if (opts?.status) {
      conditions.push("e.status = ?");
      params.push(opts.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = opts?.limit ?? 50;

    const rows = this.db
      .prepare(
        `SELECT
           e.id, e.agent_id, e.status, e.started_at, e.completed_at,
           (SELECT COUNT(*) FROM agent_step_results s WHERE s.execution_id = e.id) AS step_count,
           (SELECT COUNT(*) FROM agent_step_results s WHERE s.execution_id = e.id AND s.status = 'completed') AS completed_steps
         FROM agent_executions e
         ${where}
         ORDER BY e.started_at DESC
         LIMIT ?`
      )
      .all(...params, limit) as SummaryRow[];

    return rows.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      agentTitle: "", // 호출측에서 registry로 보완
      status: row.status as AgentExecutionStatus,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      stepCount: row.step_count,
      completedSteps: row.completed_steps,
    }));
  }

  updateStatus(executionId: string, status: AgentExecutionStatus, errorMessage?: string): void {
    const completedAt = status === "running" ? null : nowIso();
    this.db
      .prepare(
        `UPDATE agent_executions
         SET status = ?, completed_at = ?, error_message = ?
         WHERE id = ?`
      )
      .run(status, completedAt, errorMessage ?? null, executionId);
  }

  upsertStepResult(executionId: string, result: AgentStepResult): void {
    const existing = this.db
      .prepare(
        `SELECT id FROM agent_step_results
         WHERE execution_id = ? AND step_id = ?`
      )
      .get(executionId, result.stepId) as { id: string } | undefined;

    if (existing) {
      this.db
        .prepare(
          `UPDATE agent_step_results
           SET status = ?, started_at = ?, completed_at = ?, output_text = ?, error = ?
           WHERE id = ?`
        )
        .run(
          result.status,
          result.startedAt ?? null,
          result.completedAt ?? null,
          result.output ?? null,
          result.error ?? null,
          existing.id
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO agent_step_results(id, execution_id, step_id, skill_id, status, started_at, completed_at, output_text, error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          executionId,
          result.stepId,
          result.skillId,
          result.status,
          result.startedAt ?? null,
          result.completedAt ?? null,
          result.output ?? null,
          result.error ?? null
        );
    }
  }
}
