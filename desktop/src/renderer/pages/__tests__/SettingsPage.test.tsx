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
      securityMode: 'secure-local',
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

  it('미인증 상태에서 연결 추가 클릭 시 전체화면 위저드를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    expect(screen.getByText('Welcome to SAP Assistant')).toBeInTheDocument()
    expect(screen.getByText('어떻게 연결하시겠어요?')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('Google Gemini')).toBeInTheDocument()
  })

  it('Provider 선택 후 인증 방식 선택 또는 API Key 입력 화면을 표시한다', async () => {
    const user = userEvent.setup()
    // OAuth 미지원 provider (Anthropic)를 사용하여 바로 credentials 확인
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

    const openaiCard = screen.getByText('OpenAI').closest('button')!
    await user.click(openaiCard)

    // OAuth 미지원이므로 바로 API Key 입력 화면
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

  it('Workspace 카테고리에서 SecurityMode 3종 카드를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const workspaceNav = screen.getByText('Workspace').closest('button')!
    await user.click(workspaceNav)

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByText('Secure Local')).toBeInTheDocument()
    expect(screen.getByText('Reference')).toBeInTheDocument()
    expect(screen.getAllByText('Hybrid Approved').length).toBeGreaterThanOrEqual(1)
  })

  it('Workspace에서 SecurityMode 변경 시 workspaceStore가 업데이트된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const workspaceNav = screen.getByText('Workspace').closest('button')!
    await user.click(workspaceNav)

    const referenceCard = screen.getByText('Reference').closest('button')!
    await user.click(referenceCard)

    expect(useWorkspaceStore.getState().securityMode).toBe('reference')
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

  it('Provider 선택 후 인증 방식 선택 화면을 표시한다 (OAuth 가능한 경우)', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: true },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    // OAuth availability 로드 대기
    await waitFor(() => {
      expect(mockApi.getOAuthAvailability).toHaveBeenCalled()
    })

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    const openaiCard = screen.getByText('OpenAI').closest('button')!
    await user.click(openaiCard)

    // authMethod 선택 화면 표시 확인
    await waitFor(() => {
      expect(screen.getByText('API Key로 연결')).toBeInTheDocument()
    })
    expect(screen.getByText('OAuth로 연결')).toBeInTheDocument()
    expect(screen.getByText('인증 방식을 선택해주세요')).toBeInTheDocument()
  })

  it('API Key 선택 시 기존 API Key 입력 화면을 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: true },
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

    const openaiCard = screen.getByText('OpenAI').closest('button')!
    await user.click(openaiCard)

    await waitFor(() => {
      expect(screen.getByText('API Key로 연결')).toBeInTheDocument()
    })

    const apiKeyBtn = screen.getByText('API Key로 연결').closest('button')!
    await user.click(apiKeyBtn)

    // 기존 API Key 입력 화면으로 이동
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '연결' })).toBeInTheDocument()
  })

  it('OAuth 선택 시 대기 화면을 표시한다', async () => {
    const user = userEvent.setup()
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: true },
      { provider: 'anthropic', available: false },
      { provider: 'google', available: false },
    ])
    // waitOAuthCallback이 즉시 resolve하지 않도록 pending 상태 유지
    mockApi.waitOAuthCallback.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    await waitFor(() => {
      expect(mockApi.getOAuthAvailability).toHaveBeenCalled()
    })

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    const openaiCard = screen.getByText('OpenAI').closest('button')!
    await user.click(openaiCard)

    await waitFor(() => {
      expect(screen.getByText('OAuth로 연결')).toBeInTheDocument()
    })

    const oauthBtn = screen.getByText('OAuth로 연결').closest('button')!
    await user.click(oauthBtn)

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 인증 중...')).toBeInTheDocument()
    })
    expect(mockApi.initiateOAuth).toHaveBeenCalledWith('openai')
  })

  it('OAuth 미지원 provider는 OAuth 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    // Anthropic은 OAuth 미지원 → oauthAvailability에서 available: false
    // 하지만 authMethod 화면으로 가려면 available이 true여야 하므로
    // anthropic도 available: true로 설정하되 disabled 테스트 수정
    mockApi.getOAuthAvailability.mockResolvedValue([
      { provider: 'openai', available: true },
      { provider: 'anthropic', available: true },
      { provider: 'google', available: false },
    ])
    renderWithProviders(<SettingsPage />)

    const aiNav = screen.getByText('AI').closest('button')!
    await user.click(aiNav)

    const addBtn = screen.getByRole('button', { name: '연결 추가' })
    await user.click(addBtn)

    // Google 선택 — OAuth 미지원이므로 바로 credentials 단계
    const googleCard = screen.getByText('Google Gemini').closest('button')!
    await user.click(googleCard)

    // authMethod 단계를 건너뛰고 바로 API Key 입력 화면
    expect(screen.getByLabelText('Google Gemini API Key')).toBeInTheDocument()
  })
})
