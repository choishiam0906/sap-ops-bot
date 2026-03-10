// ─── Routine Template (루틴 업무 자동화) ───

export type RoutineFrequency = 'daily' | 'monthly' | 'yearly';

export interface RoutineTemplate {
  id: string;
  frequency: RoutineFrequency;
  name: string;
  description?: string;
  triggerDay?: number;     // monthly: 25, yearly: 20
  triggerMonth?: number;   // yearly: 12
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineTemplateStep {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  module?: string;         // FI, CO, MM, SD, PP, BC, PI, BTP
  sortOrder: number;
}

export interface RoutineExecution {
  id: string;
  templateId: string;
  planId: string;
  executionDate: string;   // YYYY-MM-DD
  createdAt: string;
}

export interface RoutineTemplateInput {
  frequency: RoutineFrequency;
  name: string;
  description?: string;
  triggerDay?: number;
  triggerMonth?: number;
  steps: Omit<RoutineTemplateStep, 'id' | 'templateId'>[];
}

export interface RoutineTemplateUpdate {
  name?: string;
  description?: string;
  triggerDay?: number;
  triggerMonth?: number;
  isActive?: boolean;
}
