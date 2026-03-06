import { create } from 'zustand'
import type { ProviderType } from '../../main/contracts.js'
import { DEFAULT_MODELS } from '../../main/contracts.js'
import { useSettingsStore } from './settingsStore.js'

interface ChatUIState {
  input: string
  provider: ProviderType
  model: string
  error: string
  isStreaming: boolean
  streamingContent: string
  streamingMeta: {
    sources: Array<{ title: string; category: string; relevance_score: number }>
    suggested_tcodes: string[]
    skill_used: string
  } | null
  setInput: (v: string) => void
  setProvider: (v: ProviderType) => void
  setModel: (v: string) => void
  setError: (v: string) => void
  clearError: () => void
  setIsStreaming: (v: boolean) => void
  appendStreamingContent: (token: string) => void
  setStreamingMeta: (meta: ChatUIState['streamingMeta']) => void
  resetStreaming: () => void
}

const settings = useSettingsStore.getState()

export const useChatStore = create<ChatUIState>((set) => ({
  input: '',
  provider: settings.defaultProvider,
  model: settings.defaultModel,
  error: '',
  isStreaming: false,
  streamingContent: '',
  streamingMeta: null,
  setInput: (input) => set({ input }),
  setProvider: (provider) => set({ provider, model: DEFAULT_MODELS[provider] }),
  setModel: (model) => set({ model }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamingContent: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),
  setStreamingMeta: (streamingMeta) => set({ streamingMeta }),
  resetStreaming: () =>
    set({ isStreaming: false, streamingContent: '', streamingMeta: null }),
}))
