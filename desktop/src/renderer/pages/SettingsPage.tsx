import { useState, useEffect, useRef } from 'react'
import {
  KeyRound, Sun, Moon, Monitor, AlertCircle,
  Eye, EyeOff, CheckCircle, MoreHorizontal,
} from 'lucide-react'
import type { ProviderType, AuthStatus } from '../../main/contracts.js'
import { PROVIDER_MODELS } from '../../main/contracts.js'
import { Button } from '../components/ui/Button.js'
import { Badge } from '../components/ui/Badge.js'
import { useSettingsStore } from '../stores/settingsStore.js'
import './SettingsPage.css'

const api = window.sapOpsDesktop

interface ProviderState {
  status: AuthStatus
  accountHint: string | null
  loading: boolean
  error: string
  success: string
}

const PROVIDERS: { type: ProviderType; name: string; placeholder: string }[] = [
  { type: 'codex', name: 'OpenAI (Codex)', placeholder: 'sk-...' },
  { type: 'copilot', name: 'GitHub Copilot', placeholder: 'ghp_... 또는 ghu_...' },
]

const statusConfig: Record<AuthStatus, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'neutral' }> = {
  unauthenticated: { label: '미인증', variant: 'neutral' },
  pending: { label: '인증 대기', variant: 'warning' },
  authenticated: { label: '인증됨', variant: 'success' },
  expired: { label: '만료됨', variant: 'warning' },
  error: { label: '오류', variant: 'error' },
}

const THEME_OPTIONS = [
  { value: 'system' as const, label: '시스템', Icon: Monitor, desc: 'OS 설정에 따라 자동 전환' },
  { value: 'light' as const, label: '라이트', Icon: Sun, desc: '밝은 테마' },
  { value: 'dark' as const, label: '다크', Icon: Moon, desc: '어두운 테마' },
]

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export function SettingsPage() {
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    codex: { status: 'unauthenticated', accountHint: null, loading: false, error: '', success: '' },
    copilot: { status: 'unauthenticated', accountHint: null, loading: false, error: '', success: '' },
  })
  const [apiKeys, setApiKeys] = useState<Record<ProviderType, string>>({ codex: '', copilot: '' })
  const [showKeys, setShowKeys] = useState<Record<ProviderType, boolean>>({ codex: false, copilot: false })
  const [expandedProvider, setExpandedProvider] = useState<ProviderType | null>(null)
  const [openMenu, setOpenMenu] = useState<ProviderType | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { theme, setTheme, defaultProvider, defaultModel, setDefaultProvider, setDefaultModel } = useSettingsStore()

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

  useEffect(() => { checkAllStatus() }, [])

  async function checkAllStatus() {
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
  }

  async function saveApiKey(provider: ProviderType) {
    const key = apiKeys[provider]
    if (!key.trim()) return
    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], loading: true, error: '', success: '' },
    }))
    try {
      const result = await api.setApiKey({ provider, apiKey: key.trim() })
      setStates((prev) => ({
        ...prev,
        [provider]: {
          status: result.status,
          accountHint: result.accountHint,
          loading: false,
          error: '',
          success: 'API Key가 안전하게 저장되었어요',
        },
      }))
      setApiKeys((prev) => ({ ...prev, [provider]: '' }))
      setShowKeys((prev) => ({ ...prev, [provider]: false }))
      setExpandedProvider(null)
    } catch (err) {
      console.error(`[Settings] ${provider} API Key 저장 실패:`, err)
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false, error: `저장 실패: ${errorMessage(err)}`, success: '' },
      }))
    }
  }

  async function handleLogout(provider: ProviderType) {
    try {
      await api.logout(provider)
      setStates((prev) => ({
        ...prev,
        [provider]: { status: 'unauthenticated', accountHint: null, loading: false, error: '', success: '' },
      }))
      // 기본 provider가 로그아웃된 경우, 다른 인증된 provider로 전환
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
    setExpandedProvider(provider)
    setOpenMenu(null)
  }

  const authenticatedProviders = PROVIDERS.filter((p) => states[p.type].status === 'authenticated')
  const allUnauthenticated = authenticatedProviders.length === 0

  return (
    <div className="settings-page page-enter">
      <h2 className="page-title">설정</h2>
      <p className="settings-desc">AI 연결과 기본값, 앱 테마를 관리해요</p>

      {/* 테마 설정 */}
      <section className="settings-section">
        <h3 className="section-title">테마</h3>
        <div className="theme-options" role="radiogroup" aria-label="테마 선택">
          {THEME_OPTIONS.map(({ value, label, Icon, desc }) => (
            <button
              key={value}
              role="radio"
              aria-checked={theme === value}
              className={`theme-option ${theme === value ? 'active' : ''}`}
              onClick={() => setTheme(value)}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="theme-label">{label}</span>
              <span className="theme-desc">{desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 온보딩 가이드 */}
      {allUnauthenticated && (
        <div className="onboarding-card page-enter">
          <KeyRound size={32} className="onboarding-icon" aria-hidden="true" />
          <h3>시작하기</h3>
          <p>API Key를 등록하면 AI 기반 채팅과 CBO 분석을 사용할 수 있어요. 아래 Connections에서 하나 이상의 Provider를 등록해주세요.</p>
        </div>
      )}

      {/* 기본값 (Default) 섹션 */}
      <section className="settings-section">
        <h3 className="section-title">기본값</h3>
        <div className="settings-card">
          {allUnauthenticated ? (
            <div className="settings-row">
              <span className="settings-row-label">Connection</span>
              <span className="settings-row-empty">인증된 connection이 없어요</span>
            </div>
          ) : (
            <>
              <div className="settings-row">
                <label className="settings-row-label" htmlFor="default-connection">Connection</label>
                <select
                  id="default-connection"
                  className="settings-select"
                  value={defaultProvider}
                  onChange={(e) => setDefaultProvider(e.target.value as ProviderType)}
                >
                  {authenticatedProviders.map((p) => (
                    <option key={p.type} value={p.type}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="settings-row">
                <label className="settings-row-label" htmlFor="default-model">Model</label>
                <select
                  id="default-model"
                  className="settings-select"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                >
                  {PROVIDER_MODELS[defaultProvider].map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Connections 섹션 */}
      <section className="settings-section">
        <h3 className="section-title">Connections</h3>
        <div className="settings-card">
          {PROVIDERS.map(({ type, name, placeholder }, idx) => {
            const state = states[type]
            const sc = statusConfig[state.status]
            const isAuthenticated = state.status === 'authenticated'
            const isDefault = defaultProvider === type
            const isExpanded = expandedProvider === type

            return (
              <div key={type} className={`connection-row ${idx > 0 ? 'connection-row-border' : ''}`}>
                <div className="connection-main">
                  <div className="connection-info">
                    <div className="connection-name-row">
                      <KeyRound size={16} className="connection-icon" aria-hidden="true" />
                      <span className="connection-name">{name}</span>
                      {isDefault && isAuthenticated && (
                        <Badge variant="info" aria-label="기본 연결">Default</Badge>
                      )}
                      <Badge variant={sc.variant} aria-label={`인증 상태: ${sc.label}`}>{sc.label}</Badge>
                    </div>
                    <span className="connection-hint">
                      {isAuthenticated ? (state.accountHint ?? '인증됨') : '인증되지 않았어요'}
                    </span>
                  </div>
                  <div className="connection-actions">
                    {isAuthenticated ? (
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
                              <button
                                className="action-menu-item"
                                role="menuitem"
                                onClick={() => handleSetDefault(type)}
                              >
                                기본으로 설정
                              </button>
                            )}
                            <button
                              className="action-menu-item"
                              role="menuitem"
                              onClick={() => handleChangeKey(type)}
                            >
                              API Key 변경
                            </button>
                            <button
                              className="action-menu-item action-menu-item-danger"
                              role="menuitem"
                              onClick={() => handleLogout(type)}
                            >
                              연결 해제
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpandedProvider(isExpanded ? null : type)}
                      >
                        설정
                      </Button>
                    )}
                  </div>
                </div>

                {/* 에러/성공 메시지 */}
                {state.error && (
                  <div className="provider-error" role="alert">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{state.error}</span>
                  </div>
                )}
                {state.success && (
                  <div className="provider-success" role="status">
                    <CheckCircle size={14} aria-hidden="true" />
                    <span>{state.success}</span>
                  </div>
                )}

                {/* 인라인 API Key 입력 폼 */}
                {(isExpanded || (!isAuthenticated && expandedProvider === type)) && (
                  <div className="inline-api-form">
                    <div className="api-key-input-row">
                      <input
                        type={showKeys[type] ? 'text' : 'password'}
                        value={apiKeys[type]}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [type]: e.target.value }))}
                        placeholder={placeholder}
                        className="api-key-input"
                        aria-label={`${name} API Key`}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey(type) }}
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [type]: !prev[type] }))}
                        aria-label={showKeys[type] ? '숨기기' : '보기'}
                      >
                        {showKeys[type] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => saveApiKey(type)}
                      loading={state.loading}
                      disabled={!apiKeys[type].trim()}
                    >
                      저장
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
