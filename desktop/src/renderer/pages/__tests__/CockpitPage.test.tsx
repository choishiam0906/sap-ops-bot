import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { CockpitPage } from '../CockpitPage'
import { mockApi } from '../../__tests__/setup'
import { useCockpitStore } from '../../stores/cockpitStore'
import { useAppShellStore } from '../../stores/appShellStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CockpitPage (마감 관리)', () => {
  beforeEach(() => {
    mockApi.listPlans.mockResolvedValue([])
    mockApi.getClosingStats.mockResolvedValue({
      totalPlans: 0, completedPlans: 0, delayedPlans: 0, inProgressPlans: 0,
      totalSteps: 0, completedSteps: 0, overdueSteps: 0, imminentSteps: 0,
    })
    mockApi.getRoutineExecutionPlanIds.mockResolvedValue([])
    useCockpitStore.setState({
      selectedPlanId: null,
      filter: 'all',
      searchQuery: '',
      viewMode: 'overview',
    })
    useAppShellStore.setState({
      currentSection: 'cockpit',
      subPage: 'overview',
    })
  })

  it('Overview 모드에서 통계 카드가 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })
    expect(screen.getByText('진행 중인 Plan')).toBeInTheDocument()
    expect(screen.getByText('전체 완료율')).toBeInTheDocument()
  })

  it('Overview에서 루틴 수동 실행 버튼이 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    expect(screen.getByText('루틴 수동 실행')).toBeInTheDocument()
  })

  it('all-plans 모드에서 3-panel 레이아웃이 표시된다', async () => {
    useCockpitStore.setState({ viewMode: 'all-plans' })
    useAppShellStore.setState({ subPage: 'all-plans' })
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(screen.getByText('전체 Plan')).toBeInTheDocument()
    })
  })

  it('all-plans 모드에서 Plan 목록이 렌더링된다', async () => {
    useCockpitStore.setState({ viewMode: 'all-plans' })
    useAppShellStore.setState({ subPage: 'all-plans' })
    mockApi.listPlans.mockResolvedValue([
      {
        id: 'p1',
        title: '3월 월마감',
        type: 'monthly',
        targetDate: '2026-03-31',
        status: 'in-progress',
        progressPercent: 40,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ])
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(screen.getByText('3월 월마감')).toBeInTheDocument()
    })
  })

  it('subPage 변경 시 viewMode가 동기화된다', async () => {
    useAppShellStore.setState({ subPage: 'daily' })
    renderWithProviders(<CockpitPage />)

    await waitFor(() => {
      expect(useCockpitStore.getState().viewMode).toBe('daily')
    })
  })
})
