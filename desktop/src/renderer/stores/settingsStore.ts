import { create } from 'zustand'
import type { ProviderType } from '../../main/contracts.js'
import { DEFAULT_MODELS } from '../../main/contracts.js'

type Theme = 'system' | 'light' | 'dark'
type FontFamily = 'pretendard' | 'system'
type SendKey = 'enter' | 'ctrl-enter'
type Language = 'ko' | 'en'
export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high'

interface SettingsState {
  theme: Theme
  defaultProvider: ProviderType
  defaultModel: string
  fontFamily: FontFamily
  sendKey: SendKey
  spellCheck: boolean
  autoCapitalization: boolean
  notificationsEnabled: boolean
  userName: string
  language: Language
  thinkingLevel: ThinkingLevel
  chatHistoryLimit: number

  setTheme: (theme: Theme) => void
  setDefaultProvider: (provider: ProviderType) => void
  setDefaultModel: (model: string) => void
  setFontFamily: (f: FontFamily) => void
  setSendKey: (k: SendKey) => void
  setSpellCheck: (v: boolean) => void
  setAutoCapitalization: (v: boolean) => void
  setNotificationsEnabled: (v: boolean) => void
  setUserName: (n: string) => void
  setLanguage: (l: Language) => void
  setThinkingLevel: (l: ThinkingLevel) => void
  setChatHistoryLimit: (v: number) => void
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('sap-ops-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage 접근 실패 무시 */ }
  return 'system'
}

function getInitialProvider(): ProviderType {
  try {
    const stored = localStorage.getItem('sap-ops-default-provider')
    if (stored === 'openai' || stored === 'anthropic' || stored === 'google' || stored === 'copilot' || stored === 'openrouter' || stored === 'ollama') return stored
  } catch { /* 무시 */ }
  return 'openai'
}

function getInitialModel(): string {
  try {
    const stored = localStorage.getItem('sap-ops-default-model')
    if (stored) return stored
  } catch { /* 무시 */ }
  return DEFAULT_MODELS[getInitialProvider()]
}

function getInitialFontFamily(): FontFamily {
  try {
    const stored = localStorage.getItem('sap-ops-font-family')
    if (stored === 'pretendard' || stored === 'system') return stored
  } catch { /* 무시 */ }
  return 'pretendard'
}

function getInitialSendKey(): SendKey {
  try {
    const stored = localStorage.getItem('sap-ops-send-key')
    if (stored === 'enter' || stored === 'ctrl-enter') return stored
  } catch { /* 무시 */ }
  return 'enter'
}

function getInitialBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch { /* 무시 */ }
  return defaultValue
}

function getInitialString(key: string, defaultValue: string): string {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) return stored
  } catch { /* 무시 */ }
  return defaultValue
}

function getInitialThinkingLevel(): ThinkingLevel {
  try {
    const stored = localStorage.getItem('sap-ops-thinking-level')
    if (stored === 'off' || stored === 'low' || stored === 'medium' || stored === 'high') return stored
  } catch { /* 무시 */ }
  return 'medium'
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem('sap-ops-language')
    if (stored === 'ko' || stored === 'en') return stored
  } catch { /* 무시 */ }
  return 'ko'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
  try {
    localStorage.setItem('sap-ops-theme', theme)
  } catch { /* 저장 실패 무시 */ }
}

function applyFont(fontFamily: FontFamily) {
  const root = document.documentElement
  if (fontFamily === 'pretendard') {
    root.style.fontFamily = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  } else {
    root.style.fontFamily = ''
  }
  try {
    localStorage.setItem('sap-ops-font-family', fontFamily)
  } catch { /* 저장 실패 무시 */ }
}

function persistValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch { /* 무시 */ }
}

// 초기 테마/폰트 적용
applyTheme(getInitialTheme())
applyFont(getInitialFontFamily())

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  defaultProvider: getInitialProvider(),
  defaultModel: getInitialModel(),
  fontFamily: getInitialFontFamily(),
  sendKey: getInitialSendKey(),
  spellCheck: getInitialBoolean('sap-ops-spell-check', true),
  autoCapitalization: getInitialBoolean('sap-ops-auto-capitalization', true),
  notificationsEnabled: getInitialBoolean('sap-ops-notifications', true),
  userName: getInitialString('sap-ops-user-name', ''),
  language: getInitialLanguage(),
  chatHistoryLimit: Number(getInitialString('sap-ops-chat-history-limit', '10')),
  thinkingLevel: getInitialThinkingLevel(),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setDefaultProvider: (provider) => {
    const model = DEFAULT_MODELS[provider]
    try {
      localStorage.setItem('sap-ops-default-provider', provider)
      localStorage.setItem('sap-ops-default-model', model)
    } catch { /* 무시 */ }
    set({ defaultProvider: provider, defaultModel: model })
  },
  setDefaultModel: (model) => {
    persistValue('sap-ops-default-model', model)
    set({ defaultModel: model })
  },
  setFontFamily: (fontFamily) => {
    applyFont(fontFamily)
    set({ fontFamily })
  },
  setSendKey: (sendKey) => {
    persistValue('sap-ops-send-key', sendKey)
    set({ sendKey })
  },
  setSpellCheck: (spellCheck) => {
    persistValue('sap-ops-spell-check', String(spellCheck))
    set({ spellCheck })
  },
  setAutoCapitalization: (autoCapitalization) => {
    persistValue('sap-ops-auto-capitalization', String(autoCapitalization))
    set({ autoCapitalization })
  },
  setNotificationsEnabled: (notificationsEnabled) => {
    persistValue('sap-ops-notifications', String(notificationsEnabled))
    set({ notificationsEnabled })
  },
  setUserName: (userName) => {
    persistValue('sap-ops-user-name', userName)
    set({ userName })
  },
  setLanguage: (language) => {
    persistValue('sap-ops-language', language)
    set({ language })
  },
  setThinkingLevel: (thinkingLevel) => {
    persistValue('sap-ops-thinking-level', thinkingLevel)
    set({ thinkingLevel })
  },
  setChatHistoryLimit: (chatHistoryLimit) => {
    const clamped = Math.max(2, Math.min(100, chatHistoryLimit))
    persistValue('sap-ops-chat-history-limit', String(clamped))
    // Main 프로세스에도 동기화
    try { window.sapOpsDesktop?.setChatHistoryLimit(clamped) } catch { /* 무시 */ }
    set({ chatHistoryLimit: clamped })
  },
}))
