import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { KnowledgePage } from '../KnowledgePage'
import { mockApi, resetWorkspaceStore } from '../../__tests__/setup'
import { useAppShellStore } from '../../stores/appShellStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('KnowledgePage', () => {
  beforeEach(() => {
    resetWorkspaceStore()
    useAppShellStore.setState({
      currentSection: 'knowledge',
      currentPage: 'process',
      subPage: 'process',
      sidebarCollapsed: false,
    })

    mockApi.listRoutineTemplates.mockResolvedValue([
      {
        id: 'rt-1',
        frequency: 'monthly',
        name: '월마감 검증 프로세스',
        description: '월말 전표 검증과 마감 체크를 표준화해요.',
        triggerDay: 25,
        isActive: true,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
      {
        id: 'rt-2',
        frequency: 'daily',
        name: '매입 인터페이스 점검',
        description: '일일 인터페이스 실패 건수를 확인해요.',
        isActive: false,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ])
    mockApi.getRoutineTemplate.mockImplementation(async (id: string) => {
      if (id === 'rt-1') {
        return {
          template: {
            id: 'rt-1',
            frequency: 'monthly',
            name: '월마감 검증 프로세스',
            description: '월말 전표 검증과 마감 체크를 표준화해요.',
            triggerDay: 25,
            isActive: true,
            createdAt: '2026-03-01T00:00:00Z',
            updatedAt: '2026-03-01T00:00:00Z',
          },
          steps: [
            {
              id: 's-1',
              templateId: 'rt-1',
              title: '전표 대상 추출',
              description: '마감 대상 전표를 수집해요.',
              module: 'FI',
              sortOrder: 1,
            },
            {
              id: 's-2',
              templateId: 'rt-1',
              title: '예외 건 검토',
              description: '오류 건을 검토하고 원인을 분류해요.',
              module: 'FI',
              sortOrder: 2,
            },
          ],
        }
      }

      return {
        template: {
          id: 'rt-2',
          frequency: 'daily',
          name: '매입 인터페이스 점검',
          description: '일일 인터페이스 실패 건수를 확인해요.',
          isActive: false,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
        steps: [
          {
            id: 's-3',
            templateId: 'rt-2',
            title: '실패 건 확인',
            description: '전송 실패 건수를 집계해요.',
            module: 'MM',
            sortOrder: 1,
          },
        ],
      }
    })
    mockApi.listRoutineExecutions.mockResolvedValue([
      {
        id: 'exec-1',
        templateId: 'rt-1',
        planId: 'plan-1',
        executionDate: '2026-03-25',
        createdAt: '2026-03-25T01:00:00Z',
      },
    ])
    mockApi.listAgents.mockResolvedValue([
      {
        id: 'agent-1',
        title: '월마감 자동 점검',
        description: '월마감 예외 건을 자동으로 점검해요.',
        domainPacks: ['ops'],
        category: 'automation',
        estimatedDuration: 180,
        steps: [
          {
            id: 'a-step-1',
            skillId: 'incident-triage',
            label: '예외 분류',
            config: {},
            sortOrder: 1,
          },
        ],
      },
    ])
    mockApi.searchVaultByClassification.mockImplementation(async (classification: string) => {
      if (classification === 'confidential') {
        return [
          {
            id: 'vault-1',
            classification: 'confidential',
            sourceType: 'internal_memo',
            domainPack: 'ops',
            title: '월마감 운영 가이드',
            excerpt: '월마감 예외 처리 순서를 정리한 메모예요.',
            sourceId: 'memo-1',
            filePath: '/vault/monthly-close.md',
            indexedAt: '2026-03-01T00:00:00Z',
          },
        ]
      }

      return [
        {
          id: 'vault-2',
          classification: 'reference',
          sourceType: 'sap_standard',
          domainPack: 'ops',
          title: 'FI 마감 체크리스트',
          excerpt: '마감 전 검토할 표준 체크리스트예요.',
          sourceId: 'ref-1',
          filePath: '/vault/fi-close.pdf',
          indexedAt: '2026-03-01T00:00:00Z',
        },
      ]
    })
    mockApi.searchSourceDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        sourceId: 'src-1',
        relativePath: 'fi/zfio0020.txt',
        absolutePath: 'C:/sap/cbo/fi/zfio0020.txt',
        title: 'zfio0020.txt',
        excerpt: 'FORM monthly_close_check ...',
        contentText: 'FORM monthly_close_check.',
        contentHash: 'hash-1',
        domainPack: 'ops',
        classification: 'confidential',
        tags: ['ops', 'fi'],
        indexedAt: '2026-03-02T00:00:00Z',
      },
    ])
    mockApi.listRoutineKnowledgeLinks.mockResolvedValue([])
  })

  it('process 탭에서 프로세스 허브를 렌더링한다', async () => {
    renderWithProviders(<KnowledgePage />)

    await waitFor(() => {
      expect(screen.getByText('월마감 검증 프로세스')).toBeInTheDocument()
    })

    expect(screen.getAllByText('예외 건 검토').length).toBeGreaterThan(0)
    expect(screen.getByText('월마감 자동 점검')).toBeInTheDocument()
    expect(await screen.findByText('월마감 운영 가이드')).toBeInTheDocument()
    expect(await screen.findByText('zfio0020.txt')).toBeInTheDocument()
    expect(screen.getByText('Plan ID: plan-1')).toBeInTheDocument()
  })

  it('새 프로세스를 정의할 수 있다', async () => {
    const user = userEvent.setup()
    mockApi.createRoutineTemplate.mockResolvedValue({
      id: 'rt-new',
      frequency: 'yearly',
      name: '연말 재무 점검',
      description: '연말 결산 점검 프로세스',
      triggerDay: 31,
      triggerMonth: 12,
      isActive: true,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    })

    renderWithProviders(<KnowledgePage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '새 프로세스' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '새 프로세스' }))
    await user.type(screen.getByLabelText('프로세스 이름'), '연말 재무 점검')
    await user.selectOptions(screen.getByLabelText('빈도'), 'yearly')
    await user.type(screen.getByLabelText('기준 일자'), '31')
    await user.type(screen.getByLabelText('기준 월'), '12')
    await user.type(screen.getByLabelText('설명'), '연말 결산 체크리스트를 표준화해요.')
    await user.type(screen.getByLabelText('단계 이름'), '마감 분개 검토')
    await user.type(screen.getByLabelText('단계 설명'), '결산 분개 이상 건을 확인해요.')

    await user.click(screen.getByRole('button', { name: '프로세스 저장' }))

    await waitFor(() => {
      expect(mockApi.createRoutineTemplate).toHaveBeenCalledWith({
        name: '연말 재무 점검',
        frequency: 'yearly',
        description: '연말 결산 체크리스트를 표준화해요.',
        triggerDay: 31,
        triggerMonth: 12,
        steps: [
          {
            title: '마감 분개 검토',
            description: '결산 분개 이상 건을 확인해요.',
            module: 'FI',
            sortOrder: 1,
          },
        ],
      })
    })
  }, 10000)

  it('추천 자산을 프로세스에 연결할 수 있다', async () => {
    const user = userEvent.setup()
    mockApi.linkRoutineKnowledge.mockResolvedValue({
      id: 'rk-1',
      templateId: 'rt-1',
      targetType: 'vault',
      targetId: 'vault-1',
      title: '월마감 운영 가이드',
      excerpt: '월마감 예외 처리 순서를 정리한 메모예요.',
      location: '/vault/monthly-close.md',
      classification: 'confidential',
      sourceType: 'internal_memo',
      createdAt: '2026-03-02T00:00:00Z',
    })

    renderWithProviders(<KnowledgePage />)

    const vaultTitle = await screen.findByText('월마감 운영 가이드')
    const vaultCard = vaultTitle.closest('.process-knowledge-card')
    expect(vaultCard).not.toBeNull()

    await user.click(within(vaultCard as HTMLElement).getByRole('button', { name: '프로세스에 연결' }))

    await waitFor(() => {
      expect(mockApi.linkRoutineKnowledge).toHaveBeenCalledWith({
        templateId: 'rt-1',
        targetType: 'vault',
        targetId: 'vault-1',
        title: '월마감 운영 가이드',
        excerpt: '월마감 예외 처리 순서를 정리한 메모예요.',
        location: '/vault/monthly-close.md',
        classification: 'confidential',
        sourceType: 'internal_memo',
      })
    })
  })
})
