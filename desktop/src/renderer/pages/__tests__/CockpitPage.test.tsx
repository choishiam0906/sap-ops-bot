import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { CockpitPage } from '../CockpitPage'
import { mockApi } from '../../__tests__/setup'
import { useCockpitStore } from '../../stores/cockpitStore'

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
    useCockpitStore.setState({
      selectedPlanId: null,
      filter: 'all',
      searchQuery: '',
    })
  })

  it('마감 관리 서브 네비게이션이 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    expect(screen.getByText('전체 Plan')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.getByText('완료')).toBeInTheDocument()
    expect(screen.getByText('지연')).toBeInTheDocument()
  })

  it('Plan이 없을 때 빈 상태가 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    await waitFor(() => {
      expect(screen.getByText('Plan을 선택해 주세요')).toBeInTheDocument()
    })
  })

  it('새 Plan 버튼이 표시된다', async () => {
    renderWithProviders(<CockpitPage />)
    expect(screen.getByText('새 Plan')).toBeInTheDocument()
  })

  it('필터 클릭 시 store 상태가 변경된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CockpitPage />)

    await user.click(screen.getByText('진행 중'))
    expect(useCockpitStore.getState().filter).toBe('in-progress')

    await user.click(screen.getByText('완료'))
    expect(useCockpitStore.getState().filter).toBe('completed')
  })

  it('Plan 목록이 렌더링된다', async () => {
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
})
