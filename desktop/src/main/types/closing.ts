import type { SapLabel } from './session.js';

// ─── Closing Plan (마감 프로세스) ───

export type PlanType = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type PlanStatus = 'in-progress' | 'completed' | 'delayed';
export type StepStatus = 'pending' | 'in-progress' | 'completed';

export interface ClosingPlan {
  id: string;
  title: string;
  description?: string;
  type: PlanType;
  targetDate: string; // YYYY-MM-DD
  status: PlanStatus;
  progressPercent: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface ClosingPlanInput {
  title: string;
  description?: string;
  type: PlanType;
  targetDate: string;
}

export interface ClosingPlanUpdate {
  title?: string;
  description?: string;
  type?: PlanType;
  targetDate?: string;
  status?: PlanStatus;
}

export interface ClosingStep {
  id: string;
  planId: string;
  title: string;
  description?: string;
  assignee?: string;
  module?: SapLabel;
  deadline: string; // YYYY-MM-DD
  status: StepStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClosingStepInput {
  planId: string;
  title: string;
  description?: string;
  assignee?: string;
  module?: SapLabel;
  deadline: string;
}

export interface ClosingStepUpdate {
  title?: string;
  description?: string;
  assignee?: string;
  module?: SapLabel;
  deadline?: string;
  status?: StepStatus;
}

// ─── D-day 계산 ───

export interface DdayInfo {
  daysRemaining: number;
  isOverdue: boolean;
  category: 'imminent' | 'upcoming' | 'future' | 'overdue';
}

export function calculateDday(targetDate: string): DdayInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { daysRemaining, isOverdue: true, category: 'overdue' };
  }
  if (daysRemaining <= 3) {
    return { daysRemaining, isOverdue: false, category: 'imminent' };
  }
  if (daysRemaining <= 14) {
    return { daysRemaining, isOverdue: false, category: 'upcoming' };
  }
  return { daysRemaining, isOverdue: false, category: 'future' };
}

// ─── 통계 ───

export interface ClosingStats {
  totalPlans: number;
  completedPlans: number;
  delayedPlans: number;
  inProgressPlans: number;
  totalSteps: number;
  completedSteps: number;
  overdueSteps: number;
  imminentSteps: number;
}
