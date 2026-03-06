import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { CboPage } from '../CboPage'
import { mockApi } from '../../__tests__/setup'
import { useCboStore } from '../../stores/cboStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CboPage', () => {
  beforeEach(() => {
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
  })

  it('페이지 타이틀과 3개 탭을 렌더링한다', () => {
    renderWithProviders(<CboPage />)
    expect(screen.getByText('CBO 코드 분석')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '텍스트 분석' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '파일·폴더' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '실행 이력' })).toBeInTheDocument()
  })

  it('텍스트 탭에서 소스 코드 입력란이 표시된다', () => {
    renderWithProviders(<CboPage />)
    expect(screen.getByPlaceholderText(/CBO 소스/)).toBeInTheDocument()
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
  })

  it('파일·폴더 탭으로 전환하면 파일/폴더 버튼이 표시된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CboPage />)

    await user.click(screen.getByRole('tab', { name: '파일·폴더' }))
    expect(screen.getByText('파일 선택 후 분석')).toBeInTheDocument()
    expect(screen.getByText('폴더 배치 분석')).toBeInTheDocument()
  })

  it('실행 이력 탭 전환 시 Run 목록을 로드한다', async () => {
    const user = userEvent.setup()
    mockApi.listCboRuns.mockResolvedValue([])

    renderWithProviders(<CboPage />)
    await user.click(screen.getByRole('tab', { name: '실행 이력' }))

    await waitFor(() => {
      expect(mockApi.listCboRuns).toHaveBeenCalledWith(20)
    })
  })

  it('Run 목록 로드 실패 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.listCboRuns.mockRejectedValue(new Error('DB 오류'))

    renderWithProviders(<CboPage />)
    await user.click(screen.getByRole('tab', { name: '실행 이력' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('실행 이력을 불러오지 못했어요')
    })
  })
})
