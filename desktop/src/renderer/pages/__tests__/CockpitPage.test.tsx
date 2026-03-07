import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { CockpitPage } from '../CockpitPage'
import { mockApi } from '../../__tests__/setup'
import { useCockpitStore } from '../../stores/cockpitStore'
import { useAppShellStore } from '../../stores/appShellStore'
import { useChatStore } from '../../stores/chatStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useCboStore } from '../../stores/cboStore'
import type { ChatSessionMeta } from '../../../main/contracts'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockSessionMeta: ChatSessionMeta = {
  id: 's1',
  title: 'SAP FI 문의',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T01:00:00Z',
  todoState: 'open',
  isFlagged: false,
  isArchived: false,
  labels: ['FI'],
}

describe('CockpitPage', () => {
  beforeEach(() => {
    mockApi.listSessionsFiltered.mockResolvedValue([])
    mockApi.getSessionStats.mockResolvedValue({
      all: 0, open: 0, analyzing: 0, 'in-progress': 0,
      resolved: 0, closed: 0, flagged: 0, archived: 0,
    })
    mockApi.listAuditLogs.mockResolvedValue([])
    mockApi.searchAuditLogs.mockResolvedValue([])
    useCockpitStore.setState({
      currentFilter: { kind: 'allSessions' },
      showAuditLog: false,
      statusExpanded: true,
      labelExpanded: true,
    })
    useAppShellStore.setState({ currentPage: 'audit' })
    useWorkspaceStore.setState({ securityMode: 'secure-local', domainPack: 'ops' })
    useChatStore.setState({
      currentSessionId: null,
      input: '',
      selectedSkillId: '',
      selectedSourceIds: [],
      lastExecutionMeta: null,
    })
    useCboStore.setState({
      tab: 'text',
      busy: false,
      status: '',
      error: '',
      fileName: 'inline-cbo.md',
      sourceText: '',
      useLlm: false,
      provider: 'openai',
      model: 'gpt-4.1-mini',
      result: null,
      selectedRunId: '',
      fromRunId: '',
      diffResult: null,
      progress: null,
    })
  })

  it('SAP Cockpit 헤더가 렌더링된다', async () => {
    renderWithProviders(<CockpitPage />)
    expect(screen.getByText('SAP Cockpit')).toBeInTheDocument()
  })

  it('사이드바에 상태 필터가 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    expect(screen.getByText('접수')).toBeInTheDocument()
    expect(screen.getAllByText('분석중').length).toBeGreaterThan(0)
    expect(screen.getAllByText('처리중').length).toBeGreaterThan(0)
    expect(screen.getAllByText('해결').length).toBeGreaterThan(0)
    expect(screen.getByText('종료')).toBeInTheDocument()
  })

  it('세션 카드에 상태 메뉴가 표시된다', async () => {
    mockApi.listSessionsFiltered.mockResolvedValue([mockSessionMeta])
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(screen.getByText('SAP FI 문의')).toBeInTheDocument()
    })
    // TodoStateMenu의 현재 상태 라벨 (사이드바에도 '접수'가 있으므로 getAllByText)
    const labels = screen.getAllByText('접수')
    expect(labels.length).toBeGreaterThanOrEqual(2) // 사이드바 + 카드
  })

  it('감사 로그 토글 시 감사 로그가 표시된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CockpitPage />)

    const toggleBtn = screen.getByText('감사 로그')
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(screen.getByText('감사 로그가 없어요')).toBeInTheDocument()
    })
  })

  it('빈 상태일 때 안내 메시지가 표시된다', async () => {
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(screen.getByText('해당하는 세션이 없어요')).toBeInTheDocument()
    })
  })

  it('Quick Start로 현업 문의 설명을 시작하면 Chat으로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CockpitPage />)

    const summary = screen.getByLabelText('사건/요청 요약')
    await user.type(summary, '월말 마감 중 전표 생성이 안 된다는 문의가 들어왔습니다.')

    await user.click(screen.getByText('업무 설명 시작'))

    expect(useAppShellStore.getState().currentPage).toBe('chat')
    expect(useWorkspaceStore.getState().domainPack).toBe('functional')
    expect(useChatStore.getState().selectedSkillId).toBe('sap-explainer')
    expect(useChatStore.getState().input).toContain('월말 마감 중 전표 생성이 안 된다는 문의가 들어왔습니다.')
  })

  it('세션 카드에서 열기를 누르면 해당 대화로 이동한다', async () => {
    const user = userEvent.setup()
    mockApi.listSessionsFiltered.mockResolvedValue([mockSessionMeta])
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(screen.getByText('SAP FI 문의')).toBeInTheDocument()
    })

    await user.click(screen.getByText('열기'))

    expect(useAppShellStore.getState().currentPage).toBe('chat')
    expect(useChatStore.getState().currentSessionId).toBe('s1')
  })
})
