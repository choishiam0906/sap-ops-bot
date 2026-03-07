import React, { useState, useEffect, useRef, useCallback, Children } from 'react'
import {
  KeyRound, Sun, Moon, Monitor, AlertCircle,
  Eye, EyeOff, CheckCircle, MoreHorizontal, Check, ChevronDown,
  Sparkles, Palette, Info, Plus, ArrowLeft, X,
  Keyboard, FolderCog, ShieldCheck, Tag, Command, User,
  Globe, Loader2,
} from 'lucide-react'
import type { ProviderType, AuthStatus, SecurityMode, DomainPack, OAuthAvailability } from '../../main/contracts.js'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '../../main/contracts.js'
import { Button } from '../components/ui/Button.js'
import { Badge } from '../components/ui/Badge.js'
import { useSettingsStore, type ThinkingLevel } from '../stores/settingsStore.js'
import {
  useWorkspaceStore,
  SECURITY_MODE_DETAILS,
  DOMAIN_PACK_DETAILS,
} from '../stores/workspaceStore.js'
import './SettingsPage.css'

const api = window.sapOpsDesktop

// ─── 타입 & 상수 ───────────────────────────────────

type SettingsCategory = 'app' | 'ai' | 'appearance' | 'input' | 'workspace' | 'permissions' | 'labels' | 'shortcuts' | 'preferences'
type SetupStep = 'provider' | 'authMethod' | 'credentials' | 'oauthWaiting' | 'oauthCodeEntry'
type SetupMode = 'add' | 'edit'

interface ProviderState {
  status: AuthStatus
  accountHint: string | null
  loading: boolean
  error: string
}

const CATEGORIES: { id: SettingsCategory; label: string; desc: string; Icon: typeof Monitor }[] = [
  { id: 'app', label: 'App', desc: '알림 및 업데이트', Icon: Monitor },
  { id: 'ai', label: 'AI', desc: '모델, 사고 수준, 연결', Icon: Sparkles },
  { id: 'appearance', label: 'Appearance', desc: '테마, 폰트', Icon: Palette },
  { id: 'input', label: 'Input', desc: '전송 키, 맞춤법 검사', Icon: Keyboard },
  { id: 'workspace', label: 'Workspace', desc: '보안 모드, 도메인', Icon: FolderCog },
  { id: 'permissions', label: 'Permissions', desc: '정책 요약', Icon: ShieldCheck },
  { id: 'labels', label: 'Labels', desc: '세션 레이블 관리', Icon: Tag },
  { id: 'shortcuts', label: 'Shortcuts', desc: '키보드 단축키', Icon: Command },
  { id: 'preferences', label: 'Preferences', desc: '사용자 설정', Icon: User },
]

const PROVIDERS: { type: ProviderType; name: string; placeholder: string; desc: string }[] = [
  { type: 'openai', name: 'OpenAI', placeholder: 'sk-...', desc: 'GPT-4.1, GPT-4o 등' },
  { type: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', desc: 'Claude Sonnet, Opus 등' },
  { type: 'google', name: 'Google Gemini', placeholder: 'AIza...', desc: 'Gemini Pro, Flash 등' },
]

const THEME_OPTIONS = [
  { value: 'system' as const, label: '시스템', Icon: Monitor },
  { value: 'light' as const, label: '라이트', Icon: Sun },
  { value: 'dark' as const, label: '다크', Icon: Moon },
]

const FONT_OPTIONS = [
  { value: 'pretendard' as const, label: 'Pretendard' },
  { value: 'system' as const, label: 'System' },
]

const THINKING_OPTIONS: { value: ThinkingLevel; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: '사고 과정 없이 빠르게 응답' },
  { value: 'low', label: 'Low', description: '간단한 추론' },
  { value: 'medium', label: 'Medium', description: '적절한 깊이의 추론' },
  { value: 'high', label: 'High', description: '깊은 사고 과정' },
]

const SECURITY_MODES: SecurityMode[] = ['secure-local', 'reference', 'hybrid-approved']
const DOMAIN_PACKS: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']

const SHORTCUTS = {
  chat: [
    { keys: ['Enter'], action: '메시지 전송' },
    { keys: ['Shift', 'Enter'], action: '줄바꿈' },
  ],
  navigation: [
    { keys: ['←', '→'], action: '사이드바 접기/펼치기' },
  ],
}

const APP_VERSION = '3.0.0'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

// ─── 재사용 헬퍼 컴포넌트 ────────────────────────────

/** craft SettingsCard: rounded card with auto dividers */
function SettingsCard({ children }: { children: React.ReactNode }) {
  const childArray = Children.toArray(children).filter(Boolean)
  return (
    <div className="settings-card">
      {childArray.length > 1
        ? childArray.map((child, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="card-divider" />}
              {child}
            </React.Fragment>
          ))
        : children}
    </div>
  )
}

/** craft SettingsMenuSelect: custom dropdown select */
function DropdownSelect({
  value,
  options,
  onValueChange,
  'aria-label': ariaLabel,
}: {
  value: string
  options: { value: string; label: string; description?: string }[]
  onValueChange: (v: string) => void
  'aria-label'?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="dropdown-wrapper" ref={wrapperRef}>
      <button
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        <span className="dropdown-trigger-text">{selected?.label ?? value}</span>
        <ChevronDown size={14} className="dropdown-trigger-chevron" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="dropdown-popover" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onValueChange(opt.value); setIsOpen(false) }}
                type="button"
              >
                <div className="dropdown-option-content">
                  <span className="dropdown-option-label">{opt.label}</span>
                  {opt.description && (
                    <span className="dropdown-option-desc">{opt.description}</span>
                  )}
                </div>
                {isSelected && <Check size={16} className="dropdown-option-check" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────

export function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('app')

  // Provider 인증 상태
  const defaultProviderState: ProviderState = { status: 'unauthenticated', accountHint: null, loading: false, error: '' }
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    openai: { ...defaultProviderState },
    anthropic: { ...defaultProviderState },
    google: { ...defaultProviderState },
  })
  const [openMenu, setOpenMenu] = useState<ProviderType | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Setup wizard 상태
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('provider')
  const [setupMode, setSetupMode] = useState<SetupMode>('add')
  const [setupProvider, setSetupProvider] = useState<ProviderType | null>(null)
  const [setupApiKey, setSetupApiKey] = useState('')
  const [setupShowKey, setSetupShowKey] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState(false)
  const [setupAuthMethod, setSetupAuthMethod] = useState<'api-key' | 'oauth' | null>(null)
  const [oauthAuthCode, setOauthAuthCode] = useState('')
  const [oauthAvailability, setOauthAvailability] = useState<Record<ProviderType, boolean>>({
    openai: false, anthropic: false, google: false,
  })

  const {
    theme, setTheme,
    defaultProvider, defaultModel, setDefaultProvider, setDefaultModel,
    fontFamily, setFontFamily,
    sendKey, setSendKey,
    spellCheck, setSpellCheck,
    autoCapitalization, setAutoCapitalization,
    notificationsEnabled, setNotificationsEnabled,
    userName, setUserName,
    language, setLanguage,
    thinkingLevel, setThinkingLevel,
  } = useSettingsStore()

  const {
    securityMode, setSecurityMode,
    domainPack, setDomainPack,
  } = useWorkspaceStore()

  // 외부 클릭으로 액션 메뉴 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    if (openMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  useEffect(() => {
    checkAllStatus()
    api.getOAuthAvailability().then((list: OAuthAvailability[]) => {
      const map: Record<ProviderType, boolean> = { openai: false, anthropic: false, google: false }
      for (const item of list) map[item.provider] = item.available
      setOauthAvailability(map)
    }).catch(() => {})
  }, [])

  const checkAllStatus = useCallback(async () => {
    for (const p of PROVIDERS) {
      try {
        const result = await api.getAuthStatus(p.type)
        setStates((prev) => ({
          ...prev,
          [p.type]: {
            ...prev[p.type],
            status: result?.status ?? 'unauthenticated',
            accountHint: result?.accountHint ?? null,
          },
        }))
      } catch (err) {
        console.error(`[Settings] ${p.type} 상태 확인 실패:`, err)
      }
    }
  }, [])

  // ─── Setup wizard ───────────────────────────────

  function openSetupWizard(provider?: ProviderType) {
    if (provider) {
      setSetupMode('edit')
      setSetupProvider(provider)
      setSetupStep('credentials')
      setSetupAuthMethod('api-key')
    } else {
      setSetupMode('add')
      setSetupProvider(null)
      setSetupStep('provider')
      setSetupAuthMethod(null)
    }
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
    setSetupLoading(false)
    setShowSetup(true)
  }

  function closeSetup() {
    if (setupProvider && (setupStep === 'oauthWaiting' || setupStep === 'oauthCodeEntry')) {
      api.cancelOAuth(setupProvider)
    }
    setShowSetup(false)
    setSetupProvider(null)
    setSetupStep('provider')
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
    setSetupAuthMethod(null)
    setOauthAuthCode('')
  }

  function selectSetupProvider(provider: ProviderType) {
    setSetupProvider(provider)
    setSetupError('')
    // OAuth 가능한 provider면 인증 방식 선택 단계로
    if (oauthAvailability[provider]) {
      setSetupStep('authMethod')
    } else {
      setSetupAuthMethod('api-key')
      setSetupStep('credentials')
    }
  }

  function selectAuthMethod(method: 'api-key' | 'oauth') {
    setSetupAuthMethod(method)
    if (method === 'api-key') {
      setSetupStep('credentials')
    } else {
      startOAuthFlow()
    }
  }

  async function startOAuthFlow() {
    if (!setupProvider) return
    setSetupError('')
    setOauthAuthCode('')
    try {
      const initResult = await api.initiateOAuth(setupProvider)

      if (initResult.useCallbackServer) {
        // 콜백 서버 흐름 (OpenAI, Google) — 자동 대기
        setSetupStep('oauthWaiting')
        const result = await api.waitOAuthCallback(setupProvider)
        handleOAuthSuccess(result)
      } else {
        // 수동 코드 입력 흐름 (Anthropic) — 코드 입력 화면
        setSetupStep('oauthCodeEntry')
      }
    } catch (err) {
      console.error(`[Settings] ${setupProvider} OAuth 실패:`, err)
      setSetupError(`OAuth 인증 실패: ${errorMessage(err)}`)
      setSetupStep('authMethod')
    }
  }

  async function submitOAuthCode() {
    if (!setupProvider || !oauthAuthCode.trim()) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const result = await api.submitOAuthCode(setupProvider, oauthAuthCode.trim())
      handleOAuthSuccess(result)
    } catch (err) {
      console.error(`[Settings] ${setupProvider} OAuth 코드 제출 실패:`, err)
      setSetupError(`인증 코드가 올바르지 않아요: ${errorMessage(err)}`)
    } finally {
      setSetupLoading(false)
    }
  }

  function handleOAuthSuccess(result: { status: string; accountHint: string | null }) {
    setStates((prev) => ({
      ...prev,
      [setupProvider!]: {
        status: result.status,
        accountHint: result.accountHint,
        loading: false,
        error: '',
      },
    }))
    setSetupSuccess(true)
    setTimeout(() => closeSetup(), 1200)
  }

  async function submitSetup() {
    if (!setupProvider || !setupApiKey.trim()) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const result = await api.setApiKey({ provider: setupProvider, apiKey: setupApiKey.trim() })
      setStates((prev) => ({
        ...prev,
        [setupProvider!]: {
          status: result.status,
          accountHint: result.accountHint,
          loading: false,
          error: '',
        },
      }))
      setSetupSuccess(true)
      setTimeout(() => closeSetup(), 1200)
    } catch (err) {
      console.error(`[Settings] ${setupProvider} API Key 저장 실패:`, err)
      setSetupError(`연결 실패: ${errorMessage(err)}`)
    } finally {
      setSetupLoading(false)
    }
  }

  // ─── Connection 액션 ──────────────────────────────

  async function handleLogout(provider: ProviderType) {
    try {
      await api.logout(provider)
      setStates((prev) => ({
        ...prev,
        [provider]: { status: 'unauthenticated', accountHint: null, loading: false, error: '' },
      }))
      if (defaultProvider === provider) {
        const other = PROVIDERS.find((p) => p.type !== provider && states[p.type].status === 'authenticated')
        if (other) setDefaultProvider(other.type)
      }
    } catch (err) {
      console.error(`[Settings] ${provider} 로그아웃 실패:`, err)
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], error: `연결 해제 실패: ${errorMessage(err)}` },
      }))
    }
    setOpenMenu(null)
  }

  function handleSetDefault(provider: ProviderType) {
    setDefaultProvider(provider)
    setOpenMenu(null)
  }

  function handleChangeKey(provider: ProviderType) {
    setOpenMenu(null)
    openSetupWizard(provider)
  }

  // ─── 파생 데이터 ──────────────────────────────────

  const authenticatedProviders = PROVIDERS.filter((p) => states[p.type].status === 'authenticated')
  const unconnectedProviders = PROVIDERS.filter((p) => states[p.type].status !== 'authenticated')
  const allUnauthenticated = authenticatedProviders.length === 0

  const currentModeDetail = SECURITY_MODE_DETAILS[securityMode]
  const permissionSummary = {
    outbound: securityMode === 'secure-local' ? '차단' : securityMode === 'reference' ? '허용' : '승인 후 전달',
    approval: securityMode === 'hybrid-approved' ? '요약본 승인 필요' : '필요 없음',
  }

  // ─── 렌더링 ───────────────────────────────────────

  return (
    <div className="settings-page page-enter">
      {/* 왼쪽 카테고리 네비게이션 */}
      <nav className="settings-nav" aria-label="설정 카테고리">
        <h2 className="settings-nav-title">설정</h2>
        <ul className="settings-nav-list">
          {CATEGORIES.map(({ id, label, desc, Icon }) => (
            <li key={id}>
              <button
                className={`settings-nav-item ${activeCategory === id ? 'active' : ''}`}
                onClick={() => setActiveCategory(id)}
                aria-current={activeCategory === id ? 'page' : undefined}
              >
                <Icon size={18} className="settings-nav-icon" aria-hidden="true" />
                <div className="settings-nav-text">
                  <span className="settings-nav-label">{label}</span>
                  <span className="settings-nav-desc">{desc}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 오른쪽 상세 패널 */}
      <div className="settings-detail">

        {/* ── App ── */}
        {activeCategory === 'app' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>App</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Notifications</h4>
                    </div>
                    <SettingsCard>
                      <div className="settings-toggle-row">
                        <label className="toggle-label">
                          <span className="toggle-label-text">데스크톱 알림</span>
                          <span className="toggle-label-desc">AI 작업 완료 시 데스크톱 알림을 표시해요</span>
                        </label>
                        <button
                          className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`}
                          role="switch"
                          aria-checked={notificationsEnabled}
                          aria-label="데스크톱 알림"
                          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        >
                          <span className="toggle-knob" />
                        </button>
                      </div>
                    </SettingsCard>
                  </section>

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">About</h4>
                    </div>
                    <SettingsCard>
                      <div className="settings-row">
                        <span className="row-label">Version</span>
                        <div className="row-right">
                          <span className="row-value">v{APP_VERSION}</span>
                        </div>
                      </div>
                      <div className="settings-row">
                        <span className="row-label">Runtime</span>
                        <div className="row-right">
                          <span className="row-value">Electron</span>
                        </div>
                      </div>
                    </SettingsCard>
                  </section>

                  <section className="settings-section">
                    <div className="info-card">
                      <Info size={16} className="info-card-icon" aria-hidden="true" />
                      <p>업데이트 확인과 릴리즈 노트는 GitHub에서 확인할 수 있어요.</p>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI ── */}
        {activeCategory === 'ai' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>AI</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  {/* Default 섹션 — craft: Connection + Model + Thinking */}
                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">기본값</h4>
                      <p className="section-desc">새 채팅에서 기본으로 적용되는 설정이에요</p>
                    </div>
                    <SettingsCard>
                      {allUnauthenticated ? (
                        <div className="settings-row">
                          <div className="row-label-group">
                            <span className="row-label">Connection</span>
                            <span className="row-desc">새 채팅에 사용할 AI 연결</span>
                          </div>
                          <div className="row-right">
                            <span className="row-value">연결이 없어요</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="settings-row">
                            <div className="row-label-group">
                              <span className="row-label">Connection</span>
                              <span className="row-desc">새 채팅에 사용할 AI 연결</span>
                            </div>
                            <div className="row-right">
                              <DropdownSelect
                                value={defaultProvider}
                                onValueChange={(v) => setDefaultProvider(v as ProviderType)}
                                options={authenticatedProviders.map((p) => ({ value: p.type, label: p.name }))}
                              />
                            </div>
                          </div>
                          <div className="settings-row">
                            <div className="row-label-group">
                              <span className="row-label">Model</span>
                              <span className="row-desc">새 채팅에 사용할 AI 모델</span>
                            </div>
                            <div className="row-right">
                              <DropdownSelect
                                value={defaultModel}
                                onValueChange={setDefaultModel}
                                options={PROVIDER_MODELS[defaultProvider].map((m) => ({ value: m.value, label: m.label }))}
                              />
                            </div>
                          </div>
                          <div className="settings-row">
                            <div className="row-label-group">
                              <span className="row-label">Thinking</span>
                              <span className="row-desc">새 채팅의 추론 깊이</span>
                            </div>
                            <div className="row-right">
                              <DropdownSelect
                                value={thinkingLevel}
                                onValueChange={(v) => setThinkingLevel(v as ThinkingLevel)}
                                options={THINKING_OPTIONS}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </SettingsCard>
                  </section>

                  {/* Connections 섹션 */}
                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Connections</h4>
                      <p className="section-desc">AI Provider 연결을 관리해요</p>
                    </div>

                    <SettingsCard>
                      {allUnauthenticated ? (
                        <div className="settings-row" style={{ justifyContent: 'center' }}>
                          <span className="row-value">연결이 없어요. 연결을 추가해 시작해보세요.</span>
                        </div>
                      ) : (
                        authenticatedProviders.map(({ type, name }) => {
                          const state = states[type]
                          const isDefault = defaultProvider === type
                          return (
                            <div key={type} className="connection-row">
                              <div className="connection-label">
                                <div className="connection-name-row">
                                  <KeyRound size={16} className="connection-icon" aria-hidden="true" />
                                  <span className="connection-name">{name}</span>
                                  {isDefault && <Badge variant="info" aria-label="기본 연결">Default</Badge>}
                                  <Badge variant="success" aria-label="인증 상태: 인증됨">인증됨</Badge>
                                </div>
                                <span className="connection-hint">{state.accountHint ?? '인증됨'}</span>
                              </div>
                              <div className="connection-actions">
                                <div className="action-menu-wrapper" ref={openMenu === type ? menuRef : undefined}>
                                  <button
                                    className="action-menu-trigger"
                                    onClick={() => setOpenMenu(openMenu === type ? null : type)}
                                    aria-label={`${name} 메뉴`}
                                    aria-expanded={openMenu === type}
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>
                                  {openMenu === type && (
                                    <div className="action-menu" role="menu">
                                      {!isDefault && (
                                        <button className="action-menu-item" role="menuitem" onClick={() => handleSetDefault(type)}>
                                          기본으로 설정
                                        </button>
                                      )}
                                      <button className="action-menu-item" role="menuitem" onClick={() => handleChangeKey(type)}>
                                        API Key 변경
                                      </button>
                                      <button className="action-menu-item action-menu-item-danger" role="menuitem" onClick={() => handleLogout(type)}>
                                        연결 해제
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {state.error && (
                                <div className="provider-error" role="alert">
                                  <AlertCircle size={14} aria-hidden="true" />
                                  <span>{state.error}</span>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </SettingsCard>

                    {/* Add Connection 버튼 — craft 스타일 */}
                    <div className="pt-0">
                      <button className="add-connection-btn" onClick={() => openSetupWizard()}>
                        <Plus size={14} aria-hidden="true" />
                        <span>연결 추가</span>
                      </button>
                    </div>
                  </section>

                </div>
              </div>
            </div>

            {/* ── Fullscreen Setup Wizard (craft OnboardingWizard 패턴) ── */}
            {showSetup && (
              <div className="setup-fullscreen" role="dialog" aria-modal="true" aria-label="연결 설정">
                {/* 닫기 버튼 — craft 스타일: 오른쪽 상단 고정 */}
                <button className="setup-close-btn" onClick={closeSetup} aria-label="닫기" title="닫기 (Esc)">
                  <X size={14} />
                </button>

                {/* Provider 선택 스텝 — craft ProviderSelectStep */}
                {setupStep === 'provider' && (
                  <div className="setup-wizard">
                    <div className="setup-wizard-icon">
                      <Sparkles size={40} className="setup-wizard-icon-svg" />
                    </div>
                    <h2 className="setup-wizard-title">Welcome to SAP Assistant</h2>
                    <p className="setup-wizard-desc">어떻게 연결하시겠어요?</p>

                    <div className="setup-wizard-content">
                      <div className="wizard-provider-list">
                        {(setupMode === 'add' ? unconnectedProviders : PROVIDERS).map(({ type, name, desc }) => (
                          <button key={type} className="wizard-provider-card" onClick={() => selectSetupProvider(type)}>
                            <div className="wizard-provider-icon">
                              <KeyRound size={20} />
                            </div>
                            <div className="wizard-provider-info">
                              <span className="wizard-provider-name">{name}</span>
                              <span className="wizard-provider-desc">{desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AuthMethod 스텝 — 인증 방식 선택 */}
                {setupStep === 'authMethod' && setupProvider && (
                  <div className="setup-wizard">
                    <div className="setup-wizard-icon">
                      <KeyRound size={40} className="setup-wizard-icon-svg" />
                    </div>
                    <h2 className="setup-wizard-title">{PROVIDER_LABELS[setupProvider]}에 연결하기</h2>
                    <p className="setup-wizard-desc">인증 방식을 선택해주세요</p>

                    <div className="setup-wizard-content">
                      <div className="auth-method-list">
                        <button className="auth-method-card" onClick={() => selectAuthMethod('api-key')}>
                          <div className="auth-method-icon">
                            <KeyRound size={20} />
                          </div>
                          <div className="auth-method-info">
                            <span className="auth-method-name">API Key로 연결</span>
                            <span className="auth-method-desc">API Key를 직접 입력해요</span>
                          </div>
                        </button>

                        <button
                          className="auth-method-card"
                          onClick={() => selectAuthMethod('oauth')}
                          disabled={!oauthAvailability[setupProvider]}
                        >
                          <div className="auth-method-icon">
                            <Globe size={20} />
                          </div>
                          <div className="auth-method-info">
                            <span className="auth-method-name">
                              OAuth로 연결
                              {!oauthAvailability[setupProvider] && ' (준비 중)'}
                            </span>
                            <span className="auth-method-desc">브라우저에서 안전하게 인증해요</span>
                          </div>
                        </button>
                      </div>

                      {setupError && (
                        <div className="provider-error" role="alert" style={{ marginTop: '12px' }}>
                          <AlertCircle size={14} aria-hidden="true" />
                          <span>{setupError}</span>
                        </div>
                      )}
                    </div>

                    <div className="setup-wizard-actions">
                      <button
                        className="wizard-back-btn"
                        onClick={() => { setSetupStep('provider'); setSetupError('') }}
                        type="button"
                      >
                        뒤로
                      </button>
                    </div>
                  </div>
                )}

                {/* OAuthWaiting 스텝 — 브라우저 인증 대기 */}
                {setupStep === 'oauthWaiting' && setupProvider && (
                  <div className="setup-wizard">
                    {setupSuccess ? (
                      <>
                        <div className="setup-wizard-icon">
                          <CheckCircle size={40} className="setup-wizard-icon-success" />
                        </div>
                        <h2 className="setup-wizard-title">연결 완료!</h2>
                        <p className="setup-wizard-desc">{PROVIDER_LABELS[setupProvider]}에 성공적으로 연결되었어요.</p>
                      </>
                    ) : (
                      <>
                        <div className="setup-wizard-icon">
                          <div className="oauth-waiting-spinner" />
                        </div>
                        <h2 className="setup-wizard-title">브라우저에서 인증 중...</h2>
                        <p className="setup-wizard-desc">브라우저에서 로그인을 완료해주세요</p>

                        <div className="setup-wizard-actions">
                          <button
                            className="wizard-back-btn"
                            onClick={() => {
                              api.cancelOAuth(setupProvider!)
                              setSetupStep('authMethod')
                            }}
                            type="button"
                          >
                            취소
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* OAuthCodeEntry 스텝 — 수동 코드 입력 (Anthropic 등) */}
                {setupStep === 'oauthCodeEntry' && setupProvider && (
                  <div className="setup-wizard">
                    {setupSuccess ? (
                      <>
                        <div className="setup-wizard-icon">
                          <CheckCircle size={40} className="setup-wizard-icon-success" />
                        </div>
                        <h2 className="setup-wizard-title">연결 완료!</h2>
                        <p className="setup-wizard-desc">{PROVIDER_LABELS[setupProvider]}에 성공적으로 연결되었어요.</p>
                      </>
                    ) : (
                      <>
                        <div className="setup-wizard-icon">
                          <KeyRound size={40} className="setup-wizard-icon-svg" />
                        </div>
                        <h2 className="setup-wizard-title">인증 코드 입력</h2>
                        <p className="setup-wizard-desc">브라우저 페이지에서 코드를 복사해서 아래에 붙여넣어주세요</p>

                        <div className="setup-wizard-content">
                          <div className="setup-form">
                            <div className="api-key-input-row">
                              <input
                                type="text"
                                value={oauthAuthCode}
                                onChange={(e) => setOauthAuthCode(e.target.value)}
                                placeholder="인증 코드를 여기에 붙여넣어주세요"
                                className="api-key-input oauth-code-input"
                                aria-label="Authorization Code"
                                onKeyDown={(e) => { if (e.key === 'Enter') submitOAuthCode() }}
                                autoFocus
                              />
                            </div>
                            {setupError && (
                              <div className="provider-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                <span>{setupError}</span>
                              </div>
                            )}
                          </div>

                          <div className="setup-wizard-actions">
                            <button
                              className="wizard-back-btn"
                              onClick={() => {
                                api.cancelOAuth(setupProvider!)
                                setSetupStep('authMethod')
                                setSetupError('')
                                setOauthAuthCode('')
                              }}
                              type="button"
                            >
                              취소
                            </button>
                            <Button
                              variant="primary"
                              size="md"
                              onClick={submitOAuthCode}
                              loading={setupLoading}
                              disabled={!oauthAuthCode.trim()}
                              className="wizard-connect-btn"
                            >
                              연결
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Credentials 스텝 — craft CredentialsStep */}
                {setupStep === 'credentials' && setupProvider && (
                  <div className="setup-wizard">
                    {setupSuccess ? (
                      <>
                        <div className="setup-wizard-icon">
                          <CheckCircle size={40} className="setup-wizard-icon-success" />
                        </div>
                        <h2 className="setup-wizard-title">연결 완료!</h2>
                        <p className="setup-wizard-desc">{PROVIDER_LABELS[setupProvider]}에 성공적으로 연결되었어요.</p>
                      </>
                    ) : (
                      <>
                        <div className="setup-wizard-icon">
                          <KeyRound size={40} className="setup-wizard-icon-svg" />
                        </div>
                        <h2 className="setup-wizard-title">{PROVIDER_LABELS[setupProvider]} 연결</h2>
                        <p className="setup-wizard-desc">API Key를 입력해주세요</p>

                        <div className="setup-wizard-content">
                          <div className="setup-form">
                            <div className="api-key-input-row">
                              <input
                                type={setupShowKey ? 'text' : 'password'}
                                value={setupApiKey}
                                onChange={(e) => setSetupApiKey(e.target.value)}
                                placeholder={PROVIDERS.find((p) => p.type === setupProvider)?.placeholder}
                                className="api-key-input"
                                aria-label={`${PROVIDER_LABELS[setupProvider]} API Key`}
                                onKeyDown={(e) => { if (e.key === 'Enter') submitSetup() }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setSetupShowKey(!setupShowKey)}
                                aria-label={setupShowKey ? '숨기기' : '보기'}
                              >
                                {setupShowKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            {setupError && (
                              <div className="provider-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                <span>{setupError}</span>
                              </div>
                            )}
                          </div>

                          <div className="setup-wizard-actions">
                            {setupMode === 'add' && (
                              <button
                                className="wizard-back-btn"
                                onClick={() => {
                                  if (setupProvider && oauthAvailability[setupProvider]) {
                                    setSetupStep('authMethod')
                                  } else {
                                    setSetupStep('provider')
                                  }
                                  setSetupError('')
                                }}
                                type="button"
                              >
                                뒤로
                              </button>
                            )}
                            <Button
                              variant="primary"
                              size="md"
                              onClick={submitSetup}
                              loading={setupLoading}
                              disabled={!setupApiKey.trim()}
                              className="wizard-connect-btn"
                            >
                              연결
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Appearance ── */}
        {activeCategory === 'appearance' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Appearance</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Default Theme</h4>
                    </div>
                    <SettingsCard>
                      <div className="settings-row">
                        <span className="row-label">Mode</span>
                        <div className="row-right">
                          <div className="segmented-control" role="radiogroup" aria-label="테마 선택">
                            {THEME_OPTIONS.map(({ value, label, Icon }) => (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={theme === value}
                                className={`segment-btn ${theme === value ? 'active' : ''}`}
                                onClick={() => setTheme(value)}
                              >
                                <Icon size={16} className="segment-btn-icon" aria-hidden="true" />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="settings-row">
                        <span className="row-label">Font</span>
                        <div className="row-right">
                          <div className="segmented-control" role="radiogroup" aria-label="폰트 선택">
                            {FONT_OPTIONS.map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={fontFamily === value}
                                className={`segment-btn ${fontFamily === value ? 'active' : ''}`}
                                onClick={() => setFontFamily(value)}
                              >
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SettingsCard>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Input ── */}
        {activeCategory === 'input' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Input</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Typing</h4>
                      <p className="section-desc">입력 방식을 설정해요</p>
                    </div>
                    <SettingsCard>
                      <div className="settings-toggle-row">
                        <label className="toggle-label">
                          <span className="toggle-label-text">자동 대문자</span>
                          <span className="toggle-label-desc">문장 시작 시 자동으로 대문자로 변환해요</span>
                        </label>
                        <button
                          className={`toggle-switch ${autoCapitalization ? 'active' : ''}`}
                          role="switch"
                          aria-checked={autoCapitalization}
                          aria-label="자동 대문자"
                          onClick={() => setAutoCapitalization(!autoCapitalization)}
                        >
                          <span className="toggle-knob" />
                        </button>
                      </div>
                      <div className="settings-toggle-row">
                        <label className="toggle-label">
                          <span className="toggle-label-text">맞춤법 검사</span>
                          <span className="toggle-label-desc">입력 시 맞춤법을 자동으로 검사해요</span>
                        </label>
                        <button
                          className={`toggle-switch ${spellCheck ? 'active' : ''}`}
                          role="switch"
                          aria-checked={spellCheck}
                          aria-label="맞춤법 검사"
                          onClick={() => setSpellCheck(!spellCheck)}
                        >
                          <span className="toggle-knob" />
                        </button>
                      </div>
                    </SettingsCard>
                  </section>

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Sending</h4>
                      <p className="section-desc">메시지 전송 방식을 선택해요</p>
                    </div>
                    <SettingsCard>
                      <div className="settings-row">
                        <span className="row-label">메시지 전송 키</span>
                        <div className="row-right">
                          <DropdownSelect
                            aria-label="메시지 전송 키"
                            value={sendKey}
                            onValueChange={(v) => setSendKey(v as 'enter' | 'ctrl-enter')}
                            options={[
                              { value: 'enter', label: 'Enter', description: 'Shift+Enter로 줄바꿈' },
                              { value: 'ctrl-enter', label: 'Ctrl + Enter', description: 'Enter로 줄바꿈' },
                            ]}
                          />
                        </div>
                      </div>
                    </SettingsCard>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Workspace ── */}
        {activeCategory === 'workspace' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Workspace</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Security Mode</h4>
                      <p className="section-desc">데이터 처리 방식과 외부 전송 정책을 설정해요</p>
                    </div>
                    <div className="workspace-mode-options">
                      {SECURITY_MODES.map((mode) => {
                        const detail = SECURITY_MODE_DETAILS[mode]
                        const isActive = securityMode === mode
                        return (
                          <button
                            key={mode}
                            className={`workspace-mode-card ${isActive ? 'active' : ''}`}
                            onClick={() => setSecurityMode(mode)}
                            aria-pressed={isActive}
                          >
                            <div className="workspace-mode-check">
                              {isActive && <CheckCircle size={18} />}
                            </div>
                            <div className="workspace-mode-content">
                              <span className="workspace-mode-name">{detail.label}</span>
                              <span className="workspace-mode-desc">{detail.description}</span>
                              <span className="workspace-mode-policy">{detail.outboundPolicy}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">Domain Pack</h4>
                      <p className="section-desc">SAP 도메인별 최적화된 프롬프트와 지식을 선택해요</p>
                    </div>
                    <div className="workspace-pack-options">
                      {DOMAIN_PACKS.map((pack) => {
                        const detail = DOMAIN_PACK_DETAILS[pack]
                        const isActive = domainPack === pack
                        return (
                          <button
                            key={pack}
                            className={`workspace-pack-card ${isActive ? 'active' : ''}`}
                            onClick={() => setDomainPack(pack)}
                            aria-pressed={isActive}
                          >
                            <span className="workspace-pack-label">{detail.label}</span>
                            <span className="workspace-pack-desc">{detail.description}</span>
                          </button>
                        )
                      })}
                    </div>
                    {DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode !== securityMode && (
                      <div className="workspace-recommend-banner">
                        <Info size={14} aria-hidden="true" />
                        <span>
                          이 Domain Pack의 권장 Security Mode는 <strong>{SECURITY_MODE_DETAILS[DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode].label}</strong>이에요.
                        </span>
                      </div>
                    )}
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Permissions ── */}
        {activeCategory === 'permissions' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Permissions</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">현재 정책</h4>
                      <p className="section-desc">현재 적용 중인 보안 정책이에요</p>
                    </div>
                    <SettingsCard>
                      <div className="settings-row">
                        <span className="row-label">Security Mode</span>
                        <div className="row-right">
                          <Badge variant={currentModeDetail.badgeVariant}>{currentModeDetail.label}</Badge>
                        </div>
                      </div>
                      <div className="settings-row">
                        <span className="row-label">외부 전송</span>
                        <div className="row-right">
                          <span className="row-value">{permissionSummary.outbound}</span>
                        </div>
                      </div>
                      <div className="settings-row">
                        <span className="row-label">승인 필요</span>
                        <div className="row-right">
                          <span className="row-value">{permissionSummary.approval}</span>
                        </div>
                      </div>
                    </SettingsCard>
                  </section>

                  <section className="settings-section">
                    <div className="info-card">
                      <Info size={16} className="info-card-icon" aria-hidden="true" />
                      <p>정책은 Workspace 카테고리에서 변경할 수 있어요.</p>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Labels ── */}
        {activeCategory === 'labels' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Labels</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="coming-soon-card">
                      <Tag size={40} className="coming-soon-icon" aria-hidden="true" />
                      <h4>준비 중이에요</h4>
                      <p>세션 레이블 기능은 향후 업데이트에서 추가될 예정이에요.</p>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Shortcuts ── */}
        {activeCategory === 'shortcuts' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Shortcuts</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">채팅</h4>
                    </div>
                    <SettingsCard>
                      {SHORTCUTS.chat.map(({ keys, action }) => (
                        <div key={action} className="shortcut-row">
                          <span className="shortcut-action">{action}</span>
                          <div className="shortcut-keys">
                            {keys.map((key, i) => (
                              <span key={i}>
                                {i > 0 && <span className="shortcut-plus">+</span>}
                                <kbd className="kbd">{key}</kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </SettingsCard>
                  </section>

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">내비게이션</h4>
                    </div>
                    <SettingsCard>
                      {SHORTCUTS.navigation.map(({ keys, action }) => (
                        <div key={action} className="shortcut-row">
                          <span className="shortcut-action">{action}</span>
                          <div className="shortcut-keys">
                            {keys.map((key, i) => (
                              <span key={i}>
                                {i > 0 && <span className="shortcut-plus"> / </span>}
                                <kbd className="kbd">{key}</kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </SettingsCard>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Preferences ── */}
        {activeCategory === 'preferences' && (
          <div className="settings-panel page-enter">
            <div className="panel-header">
              <h3>Preferences</h3>
            </div>
            <div className="settings-scroll-area">
              <div className="settings-content">
                <div className="settings-sections">

                  <section className="settings-section">
                    <div className="section-header-group">
                      <h4 className="section-title">기본 정보</h4>
                    </div>
                    <SettingsCard>
                      <div className="settings-row">
                        <label className="row-label" htmlFor="user-name-input">이름</label>
                        <div className="row-right">
                          <input
                            id="user-name-input"
                            type="text"
                            className="settings-input"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="이름을 입력하세요"
                          />
                        </div>
                      </div>
                      <div className="settings-row">
                        <span className="row-label">언어</span>
                        <div className="row-right">
                          <DropdownSelect
                            value={language}
                            onValueChange={(v) => setLanguage(v as 'ko' | 'en')}
                            options={[
                              { value: 'ko', label: '한국어' },
                              { value: 'en', label: 'English' },
                            ]}
                          />
                        </div>
                      </div>
                    </SettingsCard>
                  </section>

                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
