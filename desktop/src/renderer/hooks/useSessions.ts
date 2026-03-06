import { useQuery } from '@tanstack/react-query'
import type { ChatSession } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useSessions(limit = 50) {
  return useQuery<ChatSession[]>({
    queryKey: ['sessions', limit],
    queryFn: async () => {
      const list = await api.listSessions(limit)
      return Array.isArray(list) ? list : []
    },
  })
}
