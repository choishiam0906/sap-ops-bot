import React, { useState, useEffect, useCallback } from 'react'
import {
  KeyRound, AlertCircle, Eye, EyeOff, CheckCircle,
  Sparkles, Plus, X, Globe, Monitor, Github, Copy,
} from 'lucide-react'
import type {
  ProviderType, AuthStatus, DomainPack,
  OAuthAvailability,
} from '../../../main/contracts.js'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '../../../main/contracts.js'
import { ProviderIcon } from '../../lib/providerIcons.js'
import { Button } from '../ui/Button.js'
import { Badge } from '../ui/Badge.js'
import { SettingsCard } from '../ui/SettingsCard.js'
import { DropdownSelect } from '../ui/DropdownSelect.js'
import { ActionMenu } from '../ui/ActionMenu.js'
import { useSettingsStore, type ThinkingLevel } from '../../stores/settingsStore.js'
import {
  useWorkspaceStore,
} from '../../stores/workspaceStore.js'

const api = window.sapOpsDesktop

// ─── 타입 & 상수 ───────────────────────────────────

type SetupStep =
  | 'connectionMethod'   // Craft-style: 연결 방법 선택 (첫 화면)
  | 'apiKeyProvider'     // "I have an API key" → provider 선택
  | 'credentials'        // API key 입력
  | 'authMethod'         // OAuth/API Key 선택 (구독 방식에서 OAuth 불가 시)
  | 'oauthWaiting'       // OAuth 브라우저 대기
  | 'oauthCodeEntry'     // OAuth 코드 입력
  | 'deviceCodeWaiting'  // GitHub Device Code 대기
  | 'ollamaSetup'        // Ollama 로컬 설정

type SetupMode = 'add' | 'edit'

interface ProviderState {
  status: AuthStatus
  accountHint: string | null
  loading: boolean
  error: string
}

// Craft-style 연결 방법 카드 정의
interface ConnectionMethod {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  provider?: ProviderType         // 구독 기반은 바로 provider 지정
  authFlow: 'subscription' | 'api-key-select' | 'local' | 'device-code'
}

const CONNECTION_METHODS: ConnectionMethod[] = [
  {
    id: 'claude',
    title: 'Claude Pro / Max',
    description: 'Anthropic 구독을 사용해요.',
    icon: <ProviderIcon provider="anthropic" size={22} />,
    provider: 'anthropic',
    authFlow: 'subscription',
  },
  {
    id: 'chatgpt',
    title: 'Codex · ChatGPT Plus',
    description: 'ChatGPT Plus 또는 Pro 구독을 사용해요.',
    icon: <ProviderIcon provider="openai" size={22} />,
    provider: 'openai',
    authFlow: 'subscription',
  },
  {
    id: 'copilot',
    title: 'GitHub Copilot',
    description: 'GitHub 계정으로 Copilot을 연결해요.',
    icon: <Github size={22} />,
    provider: 'copilot',
    authFlow: 'device-code',
  },
  {
    id: 'api-key',
    title: 'API Key로 연결',
    description: 'OpenRouter, Google 또는 호환 provider.',
    icon: <KeyRound size={22} />,
    authFlow: 'api-key-select',
  },
  {
    id: 'local',
    title: 'Local model',
    description: 'Ollama로 로컬 모델을 실행해요.',
    icon: <Monitor size={22} />,
    provider: 'ollama',
    authFlow: 'local',
  },
]

// API Key 입력 시 선택 가능한 provider 목록
const API_KEY_PROVIDERS: { type: ProviderType; name: string; placeholder: string; desc: string }[] = [
  { type: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', desc: 'Claude Sonnet, Opus, Haiku' },
  { type: 'openai', name: 'OpenAI', placeholder: 'sk-...', desc: 'GPT-4.1, GPT-4o, o4-mini' },
  { type: 'google', name: 'Google Gemini', placeholder: 'AIza...', desc: 'Gemini 2.5 Flash, Pro' },
  { type: 'copilot', name: 'GitHub Copilot', placeholder: 'ghu_...', desc: 'GPT-4o, Claude, Gemini' },
  { type: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...', desc: '100+ 모델, 통합 API' },
]

// 모든 관리 가능한 provider
const ALL_PROVIDERS: { type: ProviderType; name: string; placeholder: string; desc: string }[] = [
  { type: 'openai', name: 'OpenAI', placeholder: 'sk-...', desc: 'GPT-4.1, GPT-4o 등' },
  { type: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', desc: 'Claude Sonnet, Opus 등' },
  { type: 'google', name: 'Google Gemini', placeholder: 'AIza...', desc: 'Gemini Pro, Flash 등' },
  { type: 'copilot', name: 'GitHub Copilot', placeholder: 'ghu_...', desc: 'GPT-4o, Claude, Gemini' },
  { type: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...', desc: '100+ 모델, 통합 API' },
  { type: 'ollama', name: 'Ollama', placeholder: 'http://localhost:11434', desc: '로컬 모델 실행' },
]

const THINKING_OPTIONS: { value: ThinkingLevel; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: '사고 과정 없이 빠르게 응답' },
  { value: 'low', label: 'Low', description: '간단한 추론' },
  { value: 'medium', label: 'Medium', description: '적절한 깊이의 추론' },
  { value: 'high', label: 'High', description: '깊은 사고 과정' },
]

const WORKSPACE_SKILL_GUIDES: Record<DomainPack, {
  skillId: string
  title: string
  outcome: string
  primarySources: string[]
}> = {
  ops: {
    skillId: 'incident-triage',
    title: '운영 장애 트리아지',
    outcome: '장애 증상과 운영 로그를 기준으로 원인 후보와 점검 순서를 정리합니다.',
    primarySources: ['Reference Vault', 'Workspace Context', '운영 로그 요약'],
  },
  functional: {
    skillId: 'sap-explainer',
    title: '현업 문의 설명',
    outcome: '오류와 프로세스를 현업 언어로 풀고, 업무 확인 항목으로 번역합니다.',
    primarySources: ['Reference Vault', '업무 가이드', 'Workspace Context'],
  },
  'cbo-maintenance': {
    skillId: 'cbo-impact-analysis',
    title: 'CBO 변경 영향 분석',
    outcome: 'CBO 소스 구조, 리스크, 검증 순서, 보고 포인트를 구조화합니다.',
    primarySources: ['Local Imported Files', 'Current CBO Run', 'Confidential Vault', 'Workspace Context'],
  },
  'pi-integration': {
    skillId: 'incident-triage',
    title: '인터페이스 장애 트리아지',
    outcome: '메시지 흐름, 어댑터, 채널, 모니터링 포인트를 운영 순서로 정리합니다.',
    primarySources: ['Reference Vault', '운영 로그 요약', 'Workspace Context'],
  },
  'btp-rap-cap': {
    skillId: 'sap-explainer',
    title: 'BTP / RAP / CAP 설명',
    outcome: '공개 지식을 기준으로 구조, 운영 포인트, 비교 설명을 제공합니다.',
    primarySources: ['Reference Vault', 'Workspace Context', '공개 MCP Source'],
  },
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function describeSourceBoundary(): string {
  return '인증된 AI 서비스를 통해 Local file, Vault, MCP connector 등 다양한 소스를 활용합니다.'
}

function describeMcpGuardrail(): string {
  return '공개 문서, 표준 가이드, read-only 검색형 MCP를 연결할 수 있습니다.'
}

// ─── 메인 컴포넌트 ─────────────────────────────────

export function SettingsAiSection() {
  // Provider 인증 상태
  const defaultProviderState: ProviderState = { status: 'unauthenticated', accountHint: null, loading: false, error: '' }
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    openai: { ...defaultProviderState },
    anthropic: { ...defaultProviderState },
    google: { ...defaultProviderState },
    copilot: { ...defaultProviderState },
    openrouter: { ...defaultProviderState },
    ollama: { ...defaultProviderState },
  })
  const [openMenu, setOpenMenu] = useState<ProviderType | null>(null)

  // Setup wizard 상태
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('connectionMethod')
  const [setupMode, setSetupMode] = useState<SetupMode>('add')
  const [setupProvider, setSetupProvider] = useState<ProviderType | null>(null)
  const [setupApiKey, setSetupApiKey] = useState('')
  const [setupShowKey, setSetupShowKey] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState(false)
  const [, setSetupAuthMethod] = useState<'api-key' | 'oauth' | null>(null)
  const [oauthAuthCode, setOauthAuthCode] = useState('')
  const [oauthAvailability, setOauthAvailability] = useState<Record<string, boolean>>({
    openai: false, anthropic: false, google: false, openrouter: false, ollama: false,
  })
  // Device Code (GitHub Copilot)
  const [deviceUserCode, setDeviceUserCode] = useState('')
  const [deviceVerificationUri, setDeviceVerificationUri] = useState('')
  const [deviceCodeCopied, setDeviceCodeCopied] = useState(false)
  // Ollama 설정
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')

  const {
    defaultProvider, defaultModel, setDefaultProvider, setDefaultModel,
    thinkingLevel, setThinkingLevel,
  } = useSettingsStore()

  const { domainPack } = useWorkspaceStore()

  const checkAllStatus = useCallback(async () => {
    for (const p of ALL_PROVIDERS) {
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

  useEffect(() => {
    checkAllStatus()
    api.getOAuthAvailability().then((list: OAuthAvailability[]) => {
      const map: Record<string, boolean> = { openai: false, anthropic: false, google: false, copilot: false, openrouter: false, ollama: false }
      for (const item of list) map[item.provider] = item.available
      setOauthAvailability(map)
    }).catch(() => {})
  }, [checkAllStatus])

  // ─── Setup wizard ───────────────────────────────

  function openSetupWizard(provider?: ProviderType) {
    if (provider) {
      setSetupMode('edit')
      setSetupProvider(provider)
      if (provider === 'ollama') {
        setSetupStep('ollamaSetup')
      } else {
        setSetupStep('credentials')
        setSetupAuthMethod('api-key')
      }
    } else {
      setSetupMode('add')
      setSetupProvider(null)
      setSetupStep('connectionMethod')
      setSetupAuthMethod(null)
    }
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
    setSetupLoading(false)
    setOllamaUrl('http://localhost:11434')
    setShowSetup(true)
  }

  function closeSetup() {
    if (setupProvider && (setupStep === 'oauthWaiting' || setupStep === 'oauthCodeEntry')) {
      api.cancelOAuth(setupProvider)
    }
    if (setupStep === 'deviceCodeWaiting') {
      api.cancelDeviceCode()
    }
    setShowSetup(false)
    setSetupProvider(null)
    setSetupStep('connectionMethod')
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
    setSetupAuthMethod(null)
    setOauthAuthCode('')
    setDeviceUserCode('')
    setDeviceVerificationUri('')
    setDeviceCodeCopied(false)
  }

  // Craft-style: 연결 방법 선택
  function selectConnectionMethod(method: ConnectionMethod) {
    setSetupError('')
    if (method.authFlow === 'subscription' && method.provider) {
      setSetupProvider(method.provider)
      // 구독 기반: OAuth 사용 가능하면 OAuth, 아니면 auth method 선택
      if (oauthAvailability[method.provider]) {
        startOAuthFlow(method.provider)
      } else {
        // OAuth 불가 → auth method 선택 화면 (API Key / OAuth 준비 중)
        setSetupStep('authMethod')
      }
    } else if (method.authFlow === 'device-code' && method.provider) {
      setSetupProvider(method.provider)
      startDeviceCodeFlow()
    } else if (method.authFlow === 'api-key-select') {
      setSetupStep('apiKeyProvider')
    } else if (method.authFlow === 'local') {
      setSetupProvider('ollama')
      setSetupStep('ollamaSetup')
    }
  }

  // API Key provider 선택 (I have an API key → 어떤 provider?)
  function selectApiKeyProvider(provider: ProviderType) {
    setSetupProvider(provider)
    setSetupAuthMethod('api-key')
    setSetupStep('credentials')
    setSetupError('')
  }

  function selectAuthMethod(method: 'api-key' | 'oauth') {
    setSetupAuthMethod(method)
    if (method === 'api-key') {
      setSetupStep('credentials')
    } else if (setupProvider) {
      startOAuthFlow(setupProvider)
    }
  }

  async function startOAuthFlow(provider?: ProviderType) {
    const target = provider ?? setupProvider
    if (!target) return
    setSetupProvider(target)
    setSetupError('')
    setOauthAuthCode('')
    try {
      const initResult = await api.initiateOAuth(target)

      if (initResult.useCallbackServer) {
        setSetupStep('oauthWaiting')
        const result = await api.waitOAuthCallback(target)
        handleOAuthSuccess(result)
      } else {
        setSetupStep('oauthCodeEntry')
      }
    } catch (err) {
      console.error(`[Settings] ${target} OAuth 실패:`, err)
      setSetupError(`OAuth 인증 실패: ${errorMessage(err)}`)
      setSetupStep('authMethod')
    }
  }

  async function startDeviceCodeFlow() {
    setSetupError('')
    setDeviceUserCode('')
    setDeviceVerificationUri('')
    setDeviceCodeCopied(false)
    try {
      const initResult = await api.initiateDeviceCode()
      setDeviceUserCode(initResult.userCode)
      setDeviceVerificationUri(initResult.verificationUri)
      setSetupStep('deviceCodeWaiting')

      // 브라우저 자동 열기
      window.open(initResult.verificationUri, '_blank')

      // polling 시작
      const result = await api.pollDeviceCode()
      handleOAuthSuccess(result)
    } catch (err) {
      console.error('[Settings] GitHub Device Code 실패:', err)
      setSetupError(`GitHub 인증 실패: ${errorMessage(err)}`)
      if (setupStep === 'deviceCodeWaiting') {
        // 에러 상태로 유지하되 다시 시도 가능
      }
    }
  }

  async function copyDeviceCode() {
    if (!deviceUserCode) return
    try {
      await navigator.clipboard.writeText(deviceUserCode)
      setDeviceCodeCopied(true)
      setTimeout(() => setDeviceCodeCopied(false), 2000)
    } catch {
      // clipboard API 실패 시 무시
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
      const msg = errorMessage(err)
      if (msg.includes('요청이 없어요') || msg.includes('만료')) {
        setSetupError('인증 세션이 만료되었어요. 다시 시도할게요...')
        setOauthAuthCode('')
        setSetupLoading(false)
        startOAuthFlow()
        return
      }
      setSetupError(`인증 코드가 올바르지 않아요: ${msg}`)
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

  async function submitOllamaSetup() {
    setSetupLoading(true)
    setSetupError('')
    try {
      const result = await api.setApiKey({ provider: 'ollama', apiKey: ollamaUrl.trim() })
      setStates((prev) => ({
        ...prev,
        ollama: {
          status: result.status,
          accountHint: result.accountHint,
          loading: false,
          error: '',
        },
      }))
      setSetupSuccess(true)
      setTimeout(() => closeSetup(), 1200)
    } catch (err) {
      console.error('[Settings] Ollama 연결 실패:', err)
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
        const other = ALL_PROVIDERS.find((p) => p.type !== provider && states[p.type].status === 'authenticated')
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

  const authenticatedProviders = ALL_PROVIDERS.filter((p) => states[p.type].status === 'authenticated')
  const allUnauthenticated = authenticatedProviders.length === 0

  const currentPackGuide = WORKSPACE_SKILL_GUIDES[domainPack]

  // ─── 렌더링 ───────────────────────────────────────

  return (
    <div className="settings-panel page-enter">
      <div className="panel-header">
        <h3>AI</h3>
      </div>
      <div className="settings-scroll-area">
        <div className="settings-content">
          <div className="settings-sections">

            {/* Default 섹션 — Connection + Model + Thinking */}
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
                          options={authenticatedProviders.map((p) => ({ value: p.type, label: p.name, icon: <ProviderIcon provider={p.type as ProviderType} size={16} /> }))}
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
                            <ProviderIcon provider={type} size={16} className="connection-icon" />
                            <span className="connection-name">{name}</span>
                            {isDefault && <Badge variant="info" aria-label="기본 연결">Default</Badge>}
                            <Badge variant="success" aria-label="인증 상태: 인증됨">인증됨</Badge>
                          </div>
                          <span className="connection-hint">{state.accountHint ?? '인증됨'}</span>
                        </div>
                        <div className="connection-actions">
                          <ActionMenu
                            isOpen={openMenu === type}
                            onToggle={() => setOpenMenu(openMenu === type ? null : type)}
                            onClose={() => setOpenMenu(null)}
                            triggerLabel={`${name} 메뉴`}
                            items={[
                              ...(!isDefault ? [{ label: '기본으로 설정', onClick: () => handleSetDefault(type) }] : []),
                              { label: type === 'ollama' ? 'URL 변경' : 'API Key 변경', onClick: () => handleChangeKey(type) },
                              { label: '연결 해제', onClick: () => handleLogout(type), danger: true },
                            ]}
                          />
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

              <div className="pt-0">
                <button className="add-connection-btn" onClick={() => openSetupWizard()}>
                  <Plus size={14} aria-hidden="true" />
                  <span>연결 추가</span>
                </button>
              </div>
            </section>

            {/* Sources & MCP 섹션 */}
            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">Sources &amp; MCP</h4>
                <p className="section-desc">현재 워크스페이스에서 어떤 근거 source와 connector 전략이 맞는지 보여줍니다</p>
              </div>
              <SettingsCard>
                <div className="settings-row">
                  <div className="row-label-group">
                    <span className="row-label">권장 Skill 흐름</span>
                    <span className="row-desc">{currentPackGuide.outcome}</span>
                  </div>
                  <div className="row-right">
                    <Badge variant="info">{currentPackGuide.title}</Badge>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="row-label-group">
                    <span className="row-label">주요 Source</span>
                    <span className="row-desc">{currentPackGuide.primarySources.join(' / ')}</span>
                  </div>
                  <div className="row-right">
                    <span className="row-value">{domainPack}</span>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="row-label-group">
                    <span className="row-label">Source 경계</span>
                    <span className="row-desc">{describeSourceBoundary()}</span>
                  </div>
                  <div className="row-right">
                    <Badge variant="info">active</Badge>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="row-label-group">
                    <span className="row-label">MCP 권장 정책</span>
                    <span className="row-desc">{describeMcpGuardrail()}</span>
                  </div>
                  <div className="row-right">
                    <Badge variant="neutral">{currentPackGuide.skillId}</Badge>
                  </div>
                </div>
              </SettingsCard>

              <div className="source-capability-grid">
                <article className="source-capability-card">
                  <div className="source-capability-head">
                    <strong>Local Files</strong>
                    <Badge variant="success">ready</Badge>
                  </div>
                  <p>CBO TXT, 운영 메모, 추출 파일을 바로 근거 source로 연결합니다.</p>
                </article>
                <article className="source-capability-card">
                  <div className="source-capability-head">
                    <strong>Vault Evidence</strong>
                    <Badge variant="success">ready</Badge>
                  </div>
                  <p>분석 결과와 운영 메모를 classification 기준으로 재사용합니다.</p>
                </article>
                <article className="source-capability-card">
                  <div className="source-capability-head">
                    <strong>Current Run</strong>
                    <Badge variant={domainPack === 'cbo-maintenance' ? 'info' : 'neutral'}>
                      {domainPack === 'cbo-maintenance' ? 'recommended' : 'optional'}
                    </Badge>
                  </div>
                  <p>CBO 실행 이력과 최근 분석 run을 후속 질문의 근거로 연결합니다.</p>
                </article>
                <article className="source-capability-card">
                  <div className="source-capability-head">
                    <strong>MCP Connectors</strong>
                    <Badge variant="info">expandable</Badge>
                  </div>
                  <p>SAP 문서, 티켓, 운영 시스템은 read-only 중심으로 단계적으로 붙이는 구성이 적합합니다.</p>
                </article>
              </div>

              <div className="info-card">
                <Globe size={16} className="info-card-icon" aria-hidden="true" />
                <p>MCP connector는 Workspace 정책과 함께 설계해야 해요. 특히 CBO 원문은 Secure Local에서 로컬 source 중심으로 유지하는 구성이 안전합니다.</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* ── Fullscreen Setup Wizard ── */}
      {showSetup && (
        <div className="setup-fullscreen" role="dialog" aria-modal="true" aria-label="연결 설정">
          <button className="setup-close-btn" onClick={closeSetup} aria-label="닫기" title="닫기 (Esc)">
            <X size={14} />
          </button>

          {/* ① Connection Method 선택 (Craft-style 첫 화면) */}
          {setupStep === 'connectionMethod' && (
            <div className="setup-wizard">
              <div className="setup-wizard-icon">
                <Sparkles size={40} className="setup-wizard-icon-svg" />
              </div>
              <h2 className="setup-wizard-title">Welcome to SAP Assistant</h2>
              <p className="setup-wizard-desc">어떻게 연결하시겠어요?</p>

              <div className="setup-wizard-content">
                <div className="wizard-provider-list">
                  {CONNECTION_METHODS.map((method) => {
                    // 이미 연결된 구독 기반 provider는 비활성화
                    const alreadyConnected = method.provider
                      ? states[method.provider]?.status === 'authenticated'
                      : false
                    return (
                      <button
                        key={method.id}
                        className="wizard-provider-card"
                        onClick={() => selectConnectionMethod(method)}
                        disabled={alreadyConnected}
                      >
                        <div className="wizard-provider-icon">
                          {method.icon}
                        </div>
                        <div className="wizard-provider-info">
                          <span className="wizard-provider-name">
                            {method.title}
                            {alreadyConnected && <span className="wizard-connected-badge">연결됨</span>}
                          </span>
                          <span className="wizard-provider-desc">{method.description}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ② API Key Provider 선택 ("I have an API key" 하위) */}
          {setupStep === 'apiKeyProvider' && (
            <div className="setup-wizard">
              <div className="setup-wizard-icon">
                <KeyRound size={40} className="setup-wizard-icon-svg" />
              </div>
              <h2 className="setup-wizard-title">API Key로 연결</h2>
              <p className="setup-wizard-desc">어떤 provider의 API Key를 사용하시겠어요?</p>

              <div className="setup-wizard-content">
                <div className="wizard-provider-list">
                  {API_KEY_PROVIDERS.map(({ type, name, desc }) => (
                    <button
                      key={type}
                      className="wizard-provider-card"
                      onClick={() => selectApiKeyProvider(type)}
                    >
                      <div className="wizard-provider-icon">
                        <ProviderIcon provider={type} size={20} />
                      </div>
                      <div className="wizard-provider-info">
                        <span className="wizard-provider-name">{name}</span>
                        <span className="wizard-provider-desc">{desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-wizard-actions">
                <button
                  className="wizard-back-btn"
                  onClick={() => { setSetupStep('connectionMethod'); setSetupError('') }}
                  type="button"
                >
                  뒤로
                </button>
              </div>
            </div>
          )}

          {/* ③ Auth Method 선택 (구독 기반에서 OAuth 불가 시) */}
          {setupStep === 'authMethod' && setupProvider && (
            <div className="setup-wizard">
              <div className="setup-wizard-icon">
                <ProviderIcon provider={setupProvider} size={40} className="setup-wizard-icon-svg" />
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
                  onClick={() => { setSetupStep('connectionMethod'); setSetupError('') }}
                  type="button"
                >
                  뒤로
                </button>
              </div>
            </div>
          )}

          {/* ④ OAuth 대기 */}
          {setupStep === 'oauthWaiting' && setupProvider && (
            <div className="setup-wizard">
              {setupSuccess ? (
                <>
                  <div className="setup-wizard-icon setup-success-icons">
                    <CheckCircle size={40} className="setup-wizard-icon-success" />
                    <ProviderIcon provider={setupProvider} size={24} className="setup-success-provider" />
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
                        setSetupStep('connectionMethod')
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

          {/* ⑤ Device Code 대기 (GitHub Copilot) */}
          {setupStep === 'deviceCodeWaiting' && (
            <div className="setup-wizard">
              {setupSuccess ? (
                <>
                  <div className="setup-wizard-icon setup-success-icons">
                    <CheckCircle size={40} className="setup-wizard-icon-success" />
                    <ProviderIcon provider="copilot" size={24} className="setup-success-provider" />
                  </div>
                  <h2 className="setup-wizard-title">연결 완료!</h2>
                  <p className="setup-wizard-desc">GitHub Copilot에 성공적으로 연결되었어요.</p>
                </>
              ) : (
                <>
                  <div className="setup-wizard-icon">
                    <Github size={40} className="setup-wizard-icon-svg" />
                  </div>
                  <h2 className="setup-wizard-title">GitHub에서 인증하기</h2>
                  <p className="setup-wizard-desc">
                    브라우저에서 아래 코드를 입력해주세요
                  </p>

                  <div className="setup-wizard-content">
                    {deviceUserCode && (
                      <div className="device-code-display">
                        <code className="device-code-value">{deviceUserCode}</code>
                        <button
                          type="button"
                          className="device-code-copy-btn"
                          onClick={copyDeviceCode}
                          aria-label="코드 복사"
                        >
                          {deviceCodeCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                          <span>{deviceCodeCopied ? '복사됨' : '복사'}</span>
                        </button>
                      </div>
                    )}

                    <p className="device-code-hint">
                      <a
                        href={deviceVerificationUri || 'https://github.com/login/device'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="device-code-link"
                      >
                        {deviceVerificationUri || 'github.com/login/device'}
                      </a>
                      에서 코드를 입력하면 자동으로 연결돼요.
                    </p>

                    <div className="device-code-waiting-indicator">
                      <div className="oauth-waiting-spinner" />
                      <span>인증 대기 중...</span>
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
                      onClick={() => {
                        api.cancelDeviceCode()
                        setSetupStep('connectionMethod')
                        setSetupError('')
                      }}
                      type="button"
                    >
                      취소
                    </button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => window.open(deviceVerificationUri || 'https://github.com/login/device', '_blank')}
                      className="wizard-connect-btn"
                    >
                      브라우저 열기
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ⑥ OAuth 코드 입력 */}
          {setupStep === 'oauthCodeEntry' && setupProvider && (
            <div className="setup-wizard">
              {setupSuccess ? (
                <>
                  <div className="setup-wizard-icon setup-success-icons">
                    <CheckCircle size={40} className="setup-wizard-icon-success" />
                    <ProviderIcon provider={setupProvider} size={24} className="setup-success-provider" />
                  </div>
                  <h2 className="setup-wizard-title">연결 완료!</h2>
                  <p className="setup-wizard-desc">{PROVIDER_LABELS[setupProvider]}에 성공적으로 연결되었어요.</p>
                </>
              ) : (
                <>
                  <div className="setup-wizard-icon">
                    <ProviderIcon provider={setupProvider} size={40} className="setup-wizard-icon-svg" />
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
                          setSetupStep('connectionMethod')
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

          {/* ⑥ API Key 입력 */}
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
                    <ProviderIcon provider={setupProvider} size={40} className="setup-wizard-icon-svg" />
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
                          placeholder={ALL_PROVIDERS.find((p) => p.type === setupProvider)?.placeholder}
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
                            setSetupStep('apiKeyProvider')
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

          {/* ⑦ Ollama 로컬 설정 */}
          {setupStep === 'ollamaSetup' && (
            <div className="setup-wizard">
              {setupSuccess ? (
                <>
                  <div className="setup-wizard-icon">
                    <CheckCircle size={40} className="setup-wizard-icon-success" />
                  </div>
                  <h2 className="setup-wizard-title">연결 완료!</h2>
                  <p className="setup-wizard-desc">Ollama에 성공적으로 연결되었어요.</p>
                </>
              ) : (
                <>
                  <div className="setup-wizard-icon">
                    <Monitor size={40} className="setup-wizard-icon-svg" />
                  </div>
                  <h2 className="setup-wizard-title">Local Model 연결</h2>
                  <p className="setup-wizard-desc">Ollama 서버 URL을 입력해주세요. 기본값은 localhost:11434예요.</p>

                  <div className="setup-wizard-content">
                    <div className="setup-form">
                      <div className="api-key-input-row">
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="api-key-input"
                          aria-label="Ollama Server URL"
                          onKeyDown={(e) => { if (e.key === 'Enter') submitOllamaSetup() }}
                          autoFocus
                        />
                      </div>
                      <p className="setup-form-hint">
                        Ollama가 실행 중이어야 해요. 설치: <code>ollama.com</code>
                      </p>
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
                          onClick={() => { setSetupStep('connectionMethod'); setSetupError('') }}
                          type="button"
                        >
                          뒤로
                        </button>
                      )}
                      <Button
                        variant="primary"
                        size="md"
                        onClick={submitOllamaSetup}
                        loading={setupLoading}
                        disabled={!ollamaUrl.trim()}
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
  )
}
