import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'
import { mockApi } from '../../__tests__/setup'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      defaultProvider: 'openai',
      defaultModel: 'gpt-4.1-mini',
      fontFamily: 'pretendard',
      sendKey: 'enter',
      spellCheck: true,
      autoCapitalization: true,
      notificationsEnabled: true,
      userName: '',
      language: 'ko',
      thinkingLevel: 'medium',
    })
    useWorkspaceStore.setState({
      domainPack: 'ops',
    })
    mockApi.getAuthStatus.mockResolvedValue({ status: 'unauthenticated', accountHint: null })
  })

  it('설정 페이지 제목을 렌더링한다', async () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
  })

  it('9개 카테고리 네비게이션을 표시한다', () => {
    renderWithProviders(<SettingsPage />)
    const nav = screen.getByRole('navigation', { name: '설정 카테고리' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByText('알림 및 업데이트')).toBeInTheDocument()
    expect(screen.getByText('모델, 사고 수준, 연결')).toBeInTheDocument()
    expect(screen.getByText('테마, 폰트')).toBeInTheDocument()
    expect(screen.getByText('전송 키, 맞춤법 검사')).toBeInTheDocument()
    expect(screen.getByText('보안 모드, 도메인')).toBeInTheDocument()
    expect(screen.getByText('정책 요약')).toBeInTheDocument()
    expect(screen.getByText('세션 레이블 관리')).toBeInTheDocument()
    expect(screen.getByText('키보드 단축키')).toBeInTheDocument()
    expect(screen.getByText('사용자 설정')).toBeInTheDocument()
  })

  it('App 패널이 기본으로 표시된다', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('heading', { name: 'App' })).toBeInTheDocument()
    expect(screen.getByText('v3.0.0')).toBeInTheDocument()
  })

  it('AI 카테고리 클릭 시 AI 패널을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    expect(screen.getByRole('heading', { name: 'AI' })).toBeInTheDocument()
    expect(screen.getByText('기본값')).toBeInTheDocument()
    expect(screen.getByText('Connections')).toBeInTheDocument()
    expect(screen.getByText('Sources & MCP')).toBeInTheDocument()
  })

  it('Provider 인증 상태를 확인한다', async () => {
    const user = userEvent.setup()
    mockApi.getAuthStatus.mockResolvedValue({ status: 'authenticated', accountHint: 'user@test.com' })
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    await waitFor(() => {
      expect(mockApi.getAuthStatus).toHaveBeenCalled()
    })
  })

  it('미인증 상태에서 연결 추가 클릭 시 Craft-style 위저드를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    expect(screen.getByText('Welcome to SAP Assistant')).toBeInTheDocument()
    expect(screen.getByText('어떻게 연결하시겠어요?')).toBeInTheDocument()
    // Craft-style 연결 방법 카드
    expect(screen.getByText('Claude Pro / Max')).toBeInTheDocument()
    expect(screen.getByText('Codex · ChatGPT Plus')).toBeInTheDocument()
    expect(screen.getByText('API Key로 연결')).toBeInTheDocument()
    expect(screen.getByText('Local model')).toBeInTheDocument()
  })

  it('API Key 연결 → Provider 선택 → API Key 입력 화면을 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: false },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // "API Key로 연결" 선택
    const apiKeyCard = screen.getByText('API Key로 연결').closest('button')!
    await user.click(apiKeyCard)

    // Provider 선택 화면
    expect(screen.getByText('어떤 provider의 API Key를 사용하시겠어요?')).toBeInTheDocument()

    // OpenAI 선택
    const openaiCard = screen.getByText('OpenAI').closest('button')!
    await user.click(openaiCard)

    // API Key 입력 화면
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '연결' })).toBeInTheDocument()
  })

  it('Appearance 카테고리에서 테마 옵션 3개를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const appearanceNav = screen.getByText('Appearance').closest('button')!
    await user.click(appearanceNav)

    expect(screen.getByText('시스템')).toBeInTheDocument()
    expect(screen.getByText('라이트')).toBeInTheDocument()
    expect(screen.getByText('다크')).toBeInTheDocument()
  })

  it('Appearance에서 테마 변경 시 store가 업데이트된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const appearanceNav = screen.getByText('Appearance').closest('button')!
    await user.click(appearanceNav)

    const darkBtn = screen.getByText('다크')
    await user.click(darkBtn)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  // ─── 새 테스트 ────────────────────────────────

  it('Input 카테고리에서 전송 키와 맞춤법 옵션을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const inputNav = screen.getByText('Input').closest('button')!
    await user.click(inputNav)

    expect(screen.getByRole('heading', { name: 'Input' })).toBeInTheDocument()
    expect(screen.getByText('자동 대문자')).toBeInTheDocument()
    expect(screen.getByText('맞춤법 검사')).toBeInTheDocument()
    expect(screen.getByLabelText('메시지 전송 키')).toBeInTheDocument()
  })

  it('Workspace 카테고리에서 Domain Pack 선택을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const workspaceNav = screen.getByText('Workspace').closest('button')!
    await user.click(workspaceNav)

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByText('Domain Pack')).toBeInTheDocument()
  })

  it('Shortcuts 카테고리에서 단축키 레퍼런스를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const shortcutsNav = screen.getByText('Shortcuts').closest('button')!
    await user.click(shortcutsNav)

    expect(screen.getByRole('heading', { name: 'Shortcuts' })).toBeInTheDocument()
    expect(screen.getByText('메시지 전송')).toBeInTheDocument()
    expect(screen.getByText('줄바꿈')).toBeInTheDocument()
    expect(screen.getByText('사이드바 접기/펼치기')).toBeInTheDocument()
  })

  it('Labels 카테고리에서 Coming Soon 상태를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const labelsNav = screen.getByText('Labels').closest('button')!
    await user.click(labelsNav)

    expect(screen.getByText('준비 중이에요')).toBeInTheDocument()
  })

  it('Preferences에서 이름 입력 시 store가 업데이트된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const preferencesNav = screen.getByText('Preferences').closest('button')!
    await user.click(preferencesNav)

    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeInTheDocument()

    const nameInput = screen.getByLabelText('이름')
    await user.type(nameInput, '홍길동')

    expect(useSettingsStore.getState().userName).toBe('홍길동')
  })

  // ─── OAuth 하이브리드 인증 테스트 ────────────────

  it('구독 카드 클릭 시 OAuth 불가면 인증 방식 선택 화면을 표시한다', async () => {
    const user = userEvent.setup()
    // ChatGPT Plus (OpenAI) — OAuth 불가
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: false },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    await waitFor(() => {
      expect(mockApi.getOAuthAvailability).toHaveBeenCalled()
    })

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // ChatGPT Plus 카드 클릭
    const chatgptCard = screen.getByText('Codex · ChatGPT Plus').closest('button')!
    await user.click(chatgptCard)

    // OAuth 불가 → authMethod 선택 화면
    await waitFor(() => {
      expect(screen.getByText('인증 방식을 선택해주세요')).toBeInTheDocument()
    })
    expect(screen.getByText('OAuth로 연결 (준비 중)')).toBeInTheDocument()
  })

  it('인증 방식에서 API Key 선택 시 API Key 입력 화면을 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: false },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    await waitFor(() => {
      expect(mockApi.getOAuthAvailability).toHaveBeenCalled()
    })

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // ChatGPT Plus 카드 클릭 → authMethod
    const chatgptCard = screen.getByText('Codex · ChatGPT Plus').closest('button')!
    await user.click(chatgptCard)

    await waitFor(() => {
      expect(screen.getByText('인증 방식을 선택해주세요')).toBeInTheDocument()
    })

    // API Key 선택
    const apiKeyBtn = screen.getByText('API Key로 연결').closest('button')!
    await user.click(apiKeyBtn)

    // API Key 입력 화면
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '연결' })).toBeInTheDocument()
  })

  it('구독 카드 클릭 시 OAuth 가능하면 OAuth 대기 화면을 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: true },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    mockApi.waitOAuthCallback.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    await waitFor(() => {
      expect(mockApi.getOAuthAvailability).toHaveBeenCalled()
    })

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // ChatGPT Plus 카드 클릭 → OAuth 바로 시작
    const chatgptCard = screen.getByText('Codex · ChatGPT Plus').closest('button')!
    await user.click(chatgptCard)

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 인증 중...')).toBeInTheDocument()
    })
    expect(mockApi.initiateOAuth).toHaveBeenCalledWith('openai')
  })

  it('Local model 선택 시 Ollama 설정 화면을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // Local model 카드 클릭
    const localCard = screen.getByText('Local model').closest('button')!
    await user.click(localCard)

    expect(screen.getByText('Local Model 연결')).toBeInTheDocument()
    expect(screen.getByLabelText('Ollama Server URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '연결' })).toBeInTheDocument()
  })
})
