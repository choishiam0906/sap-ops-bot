import { useQuery } from '@tanstack/react-query'
import type { ProviderType, ProviderAccount } from '../../main/contracts.js'
import { PROVIDER_LABELS } from '../../main/contracts.js'

const api = window.sapOpsDesktop

const ALL_PROVIDER_TYPES = Object.keys(PROVIDER_LABELS) as ProviderType[]

/**
 * 모든 Provider의 인증 상태를 조회하고, 인증된 Provider 목록을 반환한다.
 */
export function useAuthenticatedProviders() {
  const query = useQuery({
    queryKey: ['auth', 'all-status'],
    queryFn: async (): Promise<ProviderAccount[]> => {
      const results = await Promise.all(
        ALL_PROVIDER_TYPES.map(async (type) => {
          try {
            return await api.getAuthStatus(type)
          } catch {
            return { provider: type, status: 'unauthenticated' as const, accountHint: null, updatedAt: '' }
          }
        })
      )
      return results
    },
    staleTime: 30_000,
  })

  const authenticatedTypes: ProviderType[] = (query.data ?? [])
    .filter((a) => a.status === 'authenticated')
    .map((a) => a.provider)

  return { ...query, authenticatedTypes }
}
