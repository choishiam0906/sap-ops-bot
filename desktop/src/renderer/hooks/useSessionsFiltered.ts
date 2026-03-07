import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ChatSessionMeta,
  CockpitStats,
  SapLabel,
  SessionFilter,
  TodoStateKind,
} from '../../main/contracts'

const api = window.sapOpsDesktop

export function useSessionsFiltered(filter: SessionFilter, limit = 50) {
  return useQuery<ChatSessionMeta[]>({
    queryKey: ['sessions:filtered', filter, limit],
    queryFn: async () => {
      const list = await api.listSessionsFiltered(filter, limit)
      return Array.isArray(list) ? list : []
    },
  })
}

export function useSessionStats() {
  return useQuery<CockpitStats>({
    queryKey: ['sessions:stats'],
    queryFn: () => api.getSessionStats(),
    refetchInterval: 30_000,
  })
}

function useInvalidateCockpit() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['sessions:filtered'] })
    qc.invalidateQueries({ queryKey: ['sessions:stats'] })
  }
}

export function useUpdateTodoState() {
  const invalidate = useInvalidateCockpit()
  return useMutation({
    mutationFn: ({ sessionId, state }: { sessionId: string; state: TodoStateKind }) =>
      api.updateSessionTodoState(sessionId, state),
    onSuccess: invalidate,
  })
}

export function useToggleFlag() {
  const invalidate = useInvalidateCockpit()
  return useMutation({
    mutationFn: (sessionId: string) => api.toggleSessionFlag(sessionId),
    onSuccess: invalidate,
  })
}

export function useToggleArchive() {
  const invalidate = useInvalidateCockpit()
  return useMutation({
    mutationFn: (sessionId: string) => api.toggleSessionArchive(sessionId),
    onSuccess: invalidate,
  })
}

export function useAddLabel() {
  const invalidate = useInvalidateCockpit()
  return useMutation({
    mutationFn: ({ sessionId, label }: { sessionId: string; label: SapLabel }) =>
      api.addSessionLabel(sessionId, label),
    onSuccess: invalidate,
  })
}

export function useRemoveLabel() {
  const invalidate = useInvalidateCockpit()
  return useMutation({
    mutationFn: ({ sessionId, label }: { sessionId: string; label: SapLabel }) =>
      api.removeSessionLabel(sessionId, label),
    onSuccess: invalidate,
  })
}
