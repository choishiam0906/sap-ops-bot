import { useQuery } from '@tanstack/react-query'
import type { ChatMessage } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useMessages(sessionId: string | null, limit = 100) {
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', sessionId, limit],
    queryFn: async () => {
      if (!sessionId) return []
      const msgs = await api.getSessionMessages(sessionId, limit)
      return Array.isArray(msgs) ? msgs : []
    },
    enabled: !!sessionId,
  })
}
