// ─── Agent (스킬 조합 워크플로우 자동화) ───

import type { DomainPack } from "./index.js";

export type AgentCategory = "analysis" | "documentation" | "validation" | "automation";

export interface AgentDefinition {
  id: string;
  title: string;
  description: string;
  domainPacks: DomainPack[];
  category: AgentCategory;
  estimatedDuration: number; // seconds
  steps: AgentStep[];
  isCustom?: boolean; // 커스텀 에이전트 여부 (프리셋/커스텀 구분용)
}

export interface AgentStep {
  id: string;
  skillId: string; // skills/registry.ts의 스킬 ID 참조
  label: string;
  description?: string;
  config: Record<string, unknown>;
  sortOrder: number;
  dependsOn?: string[]; // 선행 스텝 ID
}

export type AgentExecutionStatus = "running" | "completed" | "failed" | "cancelled";
export type AgentStepStatus = "pending" | "running" | "completed" | "failed";

export interface AgentExecution {
  id: string;
  agentId: string;
  status: AgentExecutionStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  stepResults: AgentStepResult[];
}

export interface AgentStepResult {
  stepId: string;
  skillId: string;
  status: AgentStepStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string; // LLM 응답 텍스트
  error?: string;
}

export interface AgentExecutionSummary {
  id: string;
  agentId: string;
  agentTitle: string;
  status: AgentExecutionStatus;
  startedAt: string;
  completedAt?: string;
  stepCount: number;
  completedSteps: number;
}
