/**
 * 정책 규칙 타입 정의.
 * 규칙 기반 승인 워크플로우를 위한 조건/액션 시스템.
 */

export type PolicyAction = "auto_approve" | "require_approval" | "deny";

export type ConditionField =
  | "action"
  | "provider"
  | "domain_pack"
  | "skill_id"
  | "external_transfer";

export type ConditionOperator = "equals" | "not_equals" | "in" | "not_in";

export interface PolicyCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | string[] | boolean;
}

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  conditions: PolicyCondition[];
  action: PolicyAction;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRuleInput {
  name: string;
  description?: string;
  conditions: PolicyCondition[];
  action: PolicyAction;
  priority?: number;
}

export interface PolicyEvaluationContext {
  action: string;
  provider?: string;
  domainPack?: string;
  skillId?: string;
  externalTransfer?: boolean;
}

/** 기본 정책 규칙 (시드 데이터) */
export const DEFAULT_POLICY_RULES: PolicyRuleInput[] = [
  {
    name: "CBO 분석 자동 승인",
    description: "CBO 임팩트 분석은 자동으로 승인해요",
    conditions: [{ field: "skill_id", operator: "equals", value: "cbo-impact-analysis" }],
    action: "auto_approve",
    priority: 10,
  },
  {
    name: "마감 상태 변경 승인 필요",
    description: "마감 Plan 상태 변경은 사용자 승인이 필요해요",
    conditions: [{ field: "action", operator: "equals", value: "update_plan_status" }],
    action: "require_approval",
    priority: 20,
  },
  {
    name: "외부 데이터 전송 승인 필요",
    description: "외부로 데이터를 전송하는 작업은 승인이 필요해요",
    conditions: [{ field: "external_transfer", operator: "equals", value: true }],
    action: "require_approval",
    priority: 5,
  },
];
