import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SessionsAuditPage } from '../SessionsAuditPage'
import { mockApi } from '../../__tests__/setup'
import { useAuditStore } from '../../stores/auditStore'
import type { AuditLogEntry, ChatSession } from '../../../main/contracts'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockSession: ChatSession = {
  id: 's1',
  title: '테스트 세션',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T01:00:00Z',
}

const mockAuditEntry: AuditLogEntry = {
  id: 'a1',
  sessionId: 's1',
  runId: null,
  timestamp: '2026-03-01T12:00:00Z',
  domainPack: 'ops',
  action: 'send_message',
  externalTransfer: true,
  policyDecision: 'ALLOWED',
  provider: 'openai',
  model: 'gpt-4.1-mini',
}

describe('SessionsAuditPage', () => {
  beforeEach(() => {
    mockApi.listSessions.mockResolvedValue([])
    mockApi.listAuditLogs.mockResolvedValue([])
    mockApi.searchAuditLogs.mockResolvedValue([])
    useAuditStore.setState({ tab: 'sessions', filterAction: '', filterDateFrom: '', filterDateTo: '' })
  })

  it('세션 이력 탭에서 세션 목록을 표시한다', async () => {
    mockApi.listSessions.mockResolvedValue([mockSession])
    renderWithProviders(<SessionsAuditPage />)

    await waitFor(() => {
      expect(screen.getByText('테스트 세션')).toBeInTheDocument()
    })
  })

  it('감사 로그 탭으로 전환 시 로그를 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.listAuditLogs.mockResolvedValue([mockAuditEntry])

    renderWithProviders(<SessionsAuditPage />)

    const auditTab = screen.getByRole('tab', { name: '감사 로그' })
    await user.click(auditTab)

    await waitFor(() => {
      expect(screen.getByText('ALLOWED')).toBeInTheDocument()
    })
  })

  it('빈 상태에서 안내 메시지를 표시한다', async () => {
    renderWithProviders(<SessionsAuditPage />)

    await waitFor(() => {
      expect(screen.getByText('아직 세션이 없어요')).toBeInTheDocument()
    })
  })
})
