import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { ChatPage } from '../ChatPage'
import { mockApi } from '../../__tests__/setup'
import { useChatStore } from '../../stores/chatStore'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../../stores/workspaceStore'
import type { ChatSession } from '../../../main/contracts'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockSession: ChatSession = {
  id: 's1',
  title: 'SAP 질문',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T01:00:00Z',
}

// 기본 workspace: ops + secure-local
const defaultPack = DOMAIN_PACK_DETAILS.ops

describe('ChatPage', () => {
  beforeEach(() => {
    mockApi.listSessions.mockResolvedValue([])
    mockApi.getSessionMessages.mockResolvedValue([])
    mockApi.listSkills.mockResolvedValue([
      {
        id: 'incident-triage',
        title: '운영 장애 트리아지',
        description: '장애 증상을 분석합니다.',
        supportedDomainPacks: ['ops'],
        supportedDataTypes: ['chat'],
        defaultPromptTemplate: '',
        outputFormat: 'checklist',
        requiredSources: ['vault-reference'],
        suggestedInputs: ['현재 장애 로그를 기준으로 먼저 볼 항목을 알려줘'],
        suggestedTcodes: ['ST22'],
      },
    ])
    mockApi.recommendSkills.mockResolvedValue([
      {
        skill: {
          id: 'incident-triage',
          title: '운영 장애 트리아지',
          description: '장애 증상을 분석합니다.',
          supportedDomainPacks: ['ops'],
          supportedDataTypes: ['chat'],
          defaultPromptTemplate: '',
          outputFormat: 'checklist',
          requiredSources: ['workspace-context', 'vault-reference'],
          suggestedInputs: ['현재 장애 로그를 기준으로 먼저 볼 항목을 알려줘'],
          suggestedTcodes: ['ST22'],
        },
        reason: 'ops 워크스페이스에서 바로 사용할 수 있는 작업입니다.',
        recommendedSourceIds: ['workspace-context', 'vault-reference'],
      },
    ])
    mockApi.listSources.mockResolvedValue([
      {
        id: 'workspace-context',
        title: 'Workspace Context',
        description: '현재 워크스페이스 설정',
        kind: 'workspace',
        classification: 'mixed',
        domainPack: 'ops',
        availability: 'ready',
        sourceType: 'workspace_context',
      },
      {
        id: 'vault-reference',
        title: 'Reference Vault',
        description: '공개 참조 지식',
        kind: 'vault',
        classification: 'reference',
        domainPack: 'ops',
        availability: 'ready',
        sourceType: 'sap_standard',
      },
    ])
    useChatStore.setState({
      input: '',
      error: '',
      isStreaming: false,
      streamingContent: '',
      selectedSkillId: '',
      selectedSourceIds: [],
      lastExecutionMeta: null,
    })
    useWorkspaceStore.setState({ domainPack: 'ops' })
  })

  it('빈 상태에서 안내 메시지를 표시한다', async () => {
    renderWithProviders(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByText(defaultPack.chatTitle)).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getAllByText('운영 장애 트리아지').length).toBeGreaterThan(0)
    })
  })

  it('세션 목록을 로드하고 표시한다', async () => {
    mockApi.listSessions.mockResolvedValue([mockSession])
    renderWithProviders(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByText('SAP 질문')).toBeInTheDocument()
    })
    expect(mockApi.listSessions).toHaveBeenCalledWith(50)
  })

  it('세션 로드 실패 시 에러 메시지를 표시한다', async () => {
    mockApi.listSessions.mockRejectedValue(new Error('네트워크 오류'))
    renderWithProviders(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('제안 칩 클릭 시 입력란에 텍스트가 채워진다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />)

    await waitFor(() => {
      expect(screen.getAllByText('운영 장애 트리아지').length).toBeGreaterThan(0)
    })

    const skillSuggestion = '현재 장애 로그를 기준으로 먼저 볼 항목을 알려줘'
    const chip = screen.getByText(skillSuggestion)
    await user.click(chip)

    const textarea = screen.getByLabelText('메시지 입력')
    expect(textarea).toHaveValue(skillSuggestion)
  })

  it('메시지 전송 시 API를 호출한다', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('메시지 입력')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('메시지 입력')
    await user.type(textarea, '테스트 질문')

    // 입력 값이 반영될 때까지 대기
    await waitFor(() => {
      expect(textarea).toHaveValue('테스트 질문')
    })

    const sendBtn = screen.getByText('전송')
    await user.click(sendBtn)

    await waitFor(() => {
      expect(mockApi.sendMessage).toHaveBeenCalled()
    })

    // 호출된 인자의 message 필드 검증
    const callArgs = mockApi.sendMessage.mock.calls[0][0]
    expect(callArgs.message).toBe('테스트 질문')
    expect(callArgs.skillId).toBe('incident-triage')
    expect(callArgs.sourceIds).toEqual(['workspace-context', 'vault-reference'])
  })

  it('메시지 전송 실패 시 에러를 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.sendMessage.mockRejectedValue(new Error('전송 실패'))

    renderWithProviders(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('메시지 입력')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('메시지 입력')
    await user.type(textarea, '실패 테스트')

    const sendBtn = screen.getByText('전송')
    await user.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('전송 실패')
    })
  })
})
