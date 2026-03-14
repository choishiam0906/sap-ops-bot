import type { LocalDatabase } from "../storage/sqlite.js";
import type {
  PolicyRule,
  PolicyRuleInput,
  PolicyAction,
  PolicyCondition,
  PolicyEvaluationContext,
} from "./policyRules.js";
import { randomUUID } from "node:crypto";

/**
 * 규칙 평가 엔진.
 * DB에 저장된 정책 규칙을 우선순위 순으로 평가하여 액션을 결정한다.
 */
export class PolicyEngine {
  constructor(private readonly db: LocalDatabase) {}

  /** 규칙 생성 */
  createRule(input: PolicyRuleInput): PolicyRule {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO policy_rules (id, name, description, condition_json, action, priority, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(id, input.name, input.description ?? null, JSON.stringify(input.conditions), input.action, input.priority ?? 0, now, now);
    return this.getRule(id)!;
  }

  /** 규칙 조회 */
  getRule(id: string): PolicyRule | null {
    const row = this.db.prepare("SELECT * FROM policy_rules WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  /** 활성 규칙 목록 (우선순위 순) */
  listRules(): PolicyRule[] {
    const rows = this.db
      .prepare("SELECT * FROM policy_rules ORDER BY priority DESC, created_at")
      .all() as Record<string, unknown>[];
    return rows.map(this.mapRow);
  }

  /** 규칙 업데이트 */
  updateRule(id: string, patch: Partial<PolicyRuleInput> & { enabled?: boolean }): PolicyRule | null {
    const current = this.getRule(id);
    if (!current) return null;

    const now = new Date().toISOString();
    if (patch.name !== undefined) {
      this.db.prepare("UPDATE policy_rules SET name = ?, updated_at = ? WHERE id = ?").run(patch.name, now, id);
    }
    if (patch.description !== undefined) {
      this.db.prepare("UPDATE policy_rules SET description = ?, updated_at = ? WHERE id = ?").run(patch.description, now, id);
    }
    if (patch.conditions !== undefined) {
      this.db.prepare("UPDATE policy_rules SET condition_json = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(patch.conditions), now, id);
    }
    if (patch.action !== undefined) {
      this.db.prepare("UPDATE policy_rules SET action = ?, updated_at = ? WHERE id = ?").run(patch.action, now, id);
    }
    if (patch.priority !== undefined) {
      this.db.prepare("UPDATE policy_rules SET priority = ?, updated_at = ? WHERE id = ?").run(patch.priority, now, id);
    }
    if (patch.enabled !== undefined) {
      this.db.prepare("UPDATE policy_rules SET enabled = ?, updated_at = ? WHERE id = ?").run(patch.enabled ? 1 : 0, now, id);
    }
    return this.getRule(id);
  }

  /** 규칙 삭제 */
  deleteRule(id: string): boolean {
    const result = this.db.prepare("DELETE FROM policy_rules WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * 컨텍스트를 평가하여 정책 액션을 결정.
   * 가장 높은 우선순위의 매칭 규칙을 적용한다.
   * 매칭 규칙이 없으면 "require_approval" (안전 기본값).
   */
  evaluate(context: PolicyEvaluationContext): { action: PolicyAction; matchedRule: PolicyRule | null } {
    const rules = this.listRules().filter((r) => r.enabled);

    for (const rule of rules) {
      if (this.matchesAllConditions(rule.conditions, context)) {
        return { action: rule.action, matchedRule: rule };
      }
    }

    return { action: "require_approval", matchedRule: null };
  }

  private matchesAllConditions(
    conditions: PolicyCondition[],
    context: PolicyEvaluationContext,
  ): boolean {
    return conditions.every((cond) => this.matchCondition(cond, context));
  }

  private matchCondition(
    cond: PolicyCondition,
    context: PolicyEvaluationContext,
  ): boolean {
    const contextValue = this.getContextValue(cond.field, context);

    switch (cond.operator) {
      case "equals":
        return contextValue === cond.value;
      case "not_equals":
        return contextValue !== cond.value;
      case "in":
        return Array.isArray(cond.value) && cond.value.includes(String(contextValue));
      case "not_in":
        return Array.isArray(cond.value) && !cond.value.includes(String(contextValue));
      default:
        return false;
    }
  }

  private getContextValue(
    field: PolicyCondition["field"],
    context: PolicyEvaluationContext,
  ): string | boolean | undefined {
    switch (field) {
      case "action": return context.action;
      case "provider": return context.provider;
      case "domain_pack": return context.domainPack;
      case "skill_id": return context.skillId;
      case "external_transfer": return context.externalTransfer;
    }
  }

  private mapRow(row: Record<string, unknown>): PolicyRule {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      conditions: JSON.parse((row.condition_json as string) || "[]"),
      action: row.action as PolicyAction,
      priority: row.priority as number,
      enabled: row.enabled === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
