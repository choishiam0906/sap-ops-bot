import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  RoutineTemplate,
  RoutineTemplateInput,
  RoutineKnowledgeLink,
  RoutineKnowledgeLinkInput,
  RoutineTemplateStep,
  RoutineTemplateUpdate,
  RoutineExecution,
  RoutineFrequency,
} from '../../main/contracts'

const api = window.sapOpsDesktop

// ─── Template Queries ───

export function useRoutineTemplates() {
  return useQuery<RoutineTemplate[]>({
    queryKey: ['routine:templates'],
    queryFn: () => api.listRoutineTemplates(),
  })
}

export function useRoutineTemplatesByFrequency(frequency: RoutineFrequency) {
  return useQuery<RoutineTemplate[]>({
    queryKey: ['routine:templates', frequency],
    queryFn: () => api.listRoutineTemplatesByFrequency(frequency),
  })
}

export function useRoutineTemplate(id: string | null) {
  return useQuery<{ template: RoutineTemplate; steps: RoutineTemplateStep[] } | null>({
    queryKey: ['routine:template', id],
    queryFn: () => (id ? api.getRoutineTemplate(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

// ─── Template Mutations ───

export function useCreateRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate, Error, RoutineTemplateInput>({
    mutationFn: (input) => api.createRoutineTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine:templates'] })
    },
  })
}

export function useUpdateRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate | null, Error, { id: string; patch: RoutineTemplateUpdate }>({
    mutationFn: ({ id, patch }) => api.updateRoutineTemplate(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['routine:templates'] })
      qc.invalidateQueries({ queryKey: ['routine:template', id] })
    },
  })
}

export function useDeleteRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, string>({
    mutationFn: (id) => api.deleteRoutineTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine:templates'] })
    },
  })
}

export function useToggleRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate | null, Error, string>({
    mutationFn: (id) => api.toggleRoutineTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine:templates'] })
    },
  })
}

export function useRoutineKnowledgeLinks(templateId: string | null) {
  return useQuery<RoutineKnowledgeLink[]>({
    queryKey: ['routine:knowledge', templateId],
    queryFn: () => (templateId ? api.listRoutineKnowledgeLinks(templateId) : Promise.resolve([])),
    enabled: !!templateId,
  })
}

export function usePinRoutineKnowledgeLink() {
  const qc = useQueryClient()
  return useMutation<RoutineKnowledgeLink, Error, RoutineKnowledgeLinkInput>({
    mutationFn: (input) => api.linkRoutineKnowledge(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['routine:knowledge', input.templateId] })
    },
  })
}

export function useUnpinRoutineKnowledgeLink() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, { linkId: string; templateId: string }>({
    mutationFn: ({ linkId }) => api.unlinkRoutineKnowledge(linkId),
    onSuccess: (_data, { templateId }) => {
      qc.invalidateQueries({ queryKey: ['routine:knowledge', templateId] })
    },
  })
}

// ─── Execution ───

export function useExecuteRoutinesNow() {
  const qc = useQueryClient()
  return useMutation<{ created: number; skipped: number }, Error, void>({
    mutationFn: () => api.executeRoutinesNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine:executions'] })
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:stats'] })
    },
  })
}

export function useRoutineExecutions(date?: string) {
  return useQuery<RoutineExecution[]>({
    queryKey: ['routine:executions', date],
    queryFn: () => api.listRoutineExecutions(date),
  })
}

export function useRoutinePlanIds(date: string) {
  return useQuery<string[]>({
    queryKey: ['routine:planIds', date],
    queryFn: () => api.getRoutineExecutionPlanIds(date),
    enabled: !!date,
  })
}
