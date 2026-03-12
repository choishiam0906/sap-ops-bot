import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { CboPage } from '../CboPage'
import { mockApi } from '../../__tests__/setup'
import { useCboStore } from '../../stores/cboStore'
import { useChatStore } from '../../stores/chatStore'
import { useAppShellStore } from '../../stores/appShellStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CboPage (AnalysisMode 래퍼)', () => {
  beforeEach(() => {
    mockApi.searchSourceDocuments.mockResolvedValue([
      {
        id: 'doc1',
        sourceId: 'src1',
        relativePath: 'billing/zsd_billing.txt',
        absolutePath: 'C:/sap/cbo/billing/zsd_billing.txt',
        title: 'zsd_billing.txt',
        excerpt: 'FORM validate_authority ...',
        contentText: 'REPORT ZSD_BILLING.',
        contentHash: 'hash-1',
        domainPack: 'cbo-maintenance',
        classification: 'confidential',
        tags: ['local-folder', 'cbo-maintenance'],
        indexedAt: new Date().toISOString(),
      },
    ])
    mockApi.getSourceDocument.mockResolvedValue({
      id: 'doc1',
      sourceId: 'src1',
      relativePath: 'billing/zsd_billing.txt',
      absolutePath: 'C:/sap/cbo/billing/zsd_billing.txt',
      title: 'zsd_billing.txt',
      excerpt: 'FORM validate_authority ...',
      contentText: 'REPORT ZSD_BILLING.',
      contentHash: 'hash-1',
      domainPack: 'cbo-maintenance',
      classification: 'confidential',
      tags: ['local-folder', 'cbo-maintenance'],
      indexedAt: new Date().toISOString(),
    })
    useCboStore.setState({
      tab: 'text',
      busy: false,
      status: '',
      error: '',
      result: null,
      diffResult: null,
      sourceText: '',
      fileName: 'inline-cbo.md',
    })
    useChatStore.setState({
      currentSessionId: null,
      input: '',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      error: '',
      isStreaming: false,
      streamingContent: '',
      selectedSkillId: '',
      selectedSourceIds: [],
      caseContext: null,
      lastExecutionMeta: null,
      streamingMeta: null,
    })
    useAppShellStore.setState({ currentPage: 'cbo' })
    useWorkspaceStore.setState({ domainPack: 'cbo-maintenance' })
  })

  it('2개 분석 탭(텍스트 분석, 파일 선택)을 렌더링한다', () => {
    renderWithProviders(<CboPage />)
    expect(screen.getByRole('tab', { name: '텍스트 분석' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '파일 선택' })).toBeInTheDocument()
  })

  it('텍스트 탭에서 소스 코드 입력란이 표시된다', () => {
    renderWithProviders(<CboPage />)
    expect(screen.getByPlaceholderText(/CBO 소스/)).toBeInTheDocument()
    expect(screen.getByText('Source Library에서 가져오기')).toBeInTheDocument()
  })

  it('빈 텍스트로 분석 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CboPage />)

    // 탭 버튼이 아닌 분석 버튼을 찾기 위해 role=tab이 아닌 버튼을 선택
    const buttons = screen.getAllByText('텍스트 분석')
    const analyzeBtn = buttons.find(b => b.getAttribute('role') !== 'tab')!
    await user.click(analyzeBtn)

    expect(useCboStore.getState().error).toBe('분석할 텍스트를 입력하세요')
  })

  it('텍스트 입력 후 분석 시 API를 호출한다', async () => {
    const user = userEvent.setup()
    const mockResult = {
      summary: 'CBO 분석 완료',
      risks: [{ severity: 'high' as const, title: '위험 1', detail: '상세' }],
      recommendations: [],
      metadata: { fileName: 'test.md', charCount: 100, languageHint: 'abap' as const },
    }
    mockApi.analyzeCboText.mockResolvedValue(mockResult)

    renderWithProviders(<CboPage />)

    const textarea = screen.getByPlaceholderText(/CBO 소스/)
    await user.type(textarea, 'REPORT Z_TEST.')

    const buttons = screen.getAllByText('텍스트 분석')
    const analyzeBtn = buttons.find(b => b.getAttribute('role') !== 'tab')!
    await user.click(analyzeBtn)

    await waitFor(() => {
      expect(mockApi.analyzeCboText).toHaveBeenCalled()
    })

    expect(mockApi.analyzeCboText).toHaveBeenCalledWith(expect.objectContaining({
      domainPack: 'cbo-maintenance',
    }))
  })

  it('파일 선택 탭으로 전환하면 파일 분석 버튼이 표시된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CboPage />)

    await user.click(screen.getByRole('tab', { name: '파일 선택' }))
    expect(screen.getByText('파일 선택 후 분석')).toBeInTheDocument()
  })

  it('분석 결과에서 AI 후속 질문을 Chat으로 넘긴다', async () => {
    const user = userEvent.setup()
    useCboStore.setState({
      result: {
        summary: '이 변경은 전표 생성 로직과 권한 체크에 영향을 줄 수 있습니다.',
        risks: [{ severity: 'high' as const, title: '권한 체크 누락', detail: 'AUTHORITY-CHECK가 빠질 수 있습니다.' }],
        recommendations: [{ priority: 'p0' as const, action: '권한 체크 추가', rationale: '운영 오남용을 방지합니다.' }],
        metadata: { fileName: 'zsd_billing.txt', charCount: 120, languageHint: 'abap' as const },
        skillUsed: 'cbo-impact-analysis',
        skillTitle: 'CBO 변경 영향 분석',
        sourceIds: ['vault-confidential'],
        suggestedTcodes: ['SE80'],
      },
      sourceText: 'REPORT ZSD_BILLING.',
      fileName: 'zsd_billing.txt',
    })

    renderWithProviders(<CboPage />)

    await user.click(screen.getByRole('button', { name: '현업 설명으로 이어가기' }))

    expect(useAppShellStore.getState().currentPage).toBe('chat')
    expect(useChatStore.getState().selectedSkillId).toBe('cbo-impact-analysis')
    expect(useChatStore.getState().selectedSourceIds).toEqual(
      expect.arrayContaining(['workspace-context', 'local-imported-files', 'vault-confidential'])
    )
    expect(useChatStore.getState().caseContext?.filePath).toBe('zsd_billing.txt')
    expect(useChatStore.getState().caseContext?.sourceContent).toBe('REPORT ZSD_BILLING.')
    expect(useChatStore.getState().input).toContain('현업 사용자에게 비기술 용어로 설명')
  })

  it('Source Library 문서를 textarea로 불러온다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CboPage />)

    await waitFor(() => {
      expect(screen.getByText('zsd_billing.txt')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '불러오기' }))

    await waitFor(() => {
      expect(mockApi.getSourceDocument).toHaveBeenCalled()
    })

    expect(useCboStore.getState().fileName).toBe('zsd_billing.txt')
    expect(useCboStore.getState().sourceText).toBe('REPORT ZSD_BILLING.')
  })
})
