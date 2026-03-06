import { create } from 'zustand'
import type { ProviderType } from '../../main/contracts.js'
import { DEFAULT_MODELS } from '../../main/contracts.js'

type Theme = 'system' | 'light' | 'dark'

interface SettingsState {
  theme: Theme
  defaultProvider: ProviderType
  defaultModel: string
  setTheme: (theme: Theme) => void
  setDefaultProvider: (provider: ProviderType) => void
  setDefaultModel: (model: string) => void
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
    if (stored === 'codex' || stored === 'copilot') return stored
  } catch { /* 무시 */ }
  return 'codex'
}

function getInitialModel(): string {
  try {
    const stored = localStorage.getItem('sap-ops-default-model')
    if (stored) return stored
  } catch { /* 무시 */ }
  return DEFAULT_MODELS[getInitialProvider()]
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

// 초기 테마 적용
applyTheme(getInitialTheme())

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  defaultProvider: getInitialProvider(),
  defaultModel: getInitialModel(),
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
    try {
      localStorage.setItem('sap-ops-default-model', model)
    } catch { /* 무시 */ }
    set({ defaultModel: model })
  },
}))
