import { useQuery } from '@tanstack/react-query'
import type { CboAnalysisRunSummary } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useCboRuns(limit = 20, enabled = false) {
  return useQuery<CboAnalysisRunSummary[]>({
    queryKey: ['cboRuns', limit],
    queryFn: async () => {
      const list = await api.listCboRuns(limit)
      return Array.isArray(list) ? list : []
    },
    enabled,
  })
}
