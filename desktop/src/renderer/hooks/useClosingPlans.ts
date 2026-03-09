import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ClosingPlan,
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStep,
  ClosingStepInput,
  ClosingStepUpdate,
  ClosingStats,
} from '../../main/contracts'

const api = window.sapOpsDesktop

// ─── Plan Queries ───

export function usePlans(limit?: number) {
  return useQuery<ClosingPlan[]>({
    queryKey: ['closing:plans', limit],
    queryFn: () => api.listPlans(limit),
  })
}

export function usePlan(planId: string | null) {
  return useQuery<ClosingPlan | null>({
    queryKey: ['closing:plan', planId],
    queryFn: () => (planId ? api.getPlan(planId) : Promise.resolve(null)),
    enabled: !!planId,
  })
}

// ─── Plan Mutations ───

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation<ClosingPlan, Error, ClosingPlanInput>({
    mutationFn: (input) => api.createPlan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation<ClosingPlan | null, Error, { planId: string; update: ClosingPlanUpdate }>({
    mutationFn: ({ planId, update }) => api.updatePlan(planId, update),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:plan', planId] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, string>({
    mutationFn: (planId) => api.deletePlan(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

// ─── Step Queries ───

export function useSteps(planId: string | null) {
  return useQuery<ClosingStep[]>({
    queryKey: ['closing:steps', planId],
    queryFn: () => (planId ? api.listSteps(planId) : Promise.resolve([])),
    enabled: !!planId,
  })
}

// ─── Step Mutations ───

export function useCreateStep() {
  const qc = useQueryClient()
  return useMutation<ClosingStep, Error, ClosingStepInput>({
    mutationFn: (input) => api.createStep(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['closing:steps', input.planId] })
      qc.invalidateQueries({ queryKey: ['closing:plan', input.planId] })
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useUpdateStep() {
  const qc = useQueryClient()
  return useMutation<ClosingStep | null, Error, { stepId: string; update: ClosingStepUpdate }>({
    mutationFn: ({ stepId, update }) => api.updateStep(stepId, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closing:steps'] })
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:plan'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, { stepId: string; planId: string }>({
    mutationFn: ({ stepId }) => api.deleteStep(stepId),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ['closing:steps', planId] })
      qc.invalidateQueries({ queryKey: ['closing:plan', planId] })
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useReorderSteps() {
  const qc = useQueryClient()
  return useMutation<void, Error, { planId: string; stepIds: string[] }>({
    mutationFn: ({ planId, stepIds }) => api.reorderSteps(planId, stepIds),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ['closing:steps', planId] })
    },
  })
}

// ─── Stats ───

export function useClosingStats() {
  return useQuery<ClosingStats>({
    queryKey: ['closing:stats'],
    queryFn: () => api.getClosingStats(),
    refetchInterval: 60_000,
  })
}
