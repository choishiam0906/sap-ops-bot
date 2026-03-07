import { create } from 'zustand'
import type { CaseContext, ProviderType, SkillExecutionMeta } from '../../main/contracts.js'
import { DEFAULT_MODELS } from '../../main/contracts.js'
import { useSettingsStore } from './settingsStore.js'

interface ChatUIState {
  currentSessionId: string | null
  input: string
  provider: ProviderType
  model: string
  error: string
  isStreaming: boolean
  streamingContent: string
  selectedSkillId: string
  selectedSourceIds: string[]
  caseContext: CaseContext | null
  lastExecutionMeta: SkillExecutionMeta | null
  streamingMeta: {
    sources: Array<{ title: string; category: string; relevance_score: number }>
    suggested_tcodes: string[]
    skill_used: string
    skill_title?: string
    source_count?: number
  } | null
  setInput: (v: string) => void
  setCurrentSessionId: (v: string | null) => void
  setProvider: (v: ProviderType) => void
  setModel: (v: string) => void
  setError: (v: string) => void
  clearError: () => void
  setIsStreaming: (v: boolean) => void
  setSelectedSkillId: (v: string) => void
  setSelectedSourceIds: (v: string[]) => void
  setCaseContext: (v: CaseContext | null) => void
  toggleSourceId: (v: string) => void
  setLastExecutionMeta: (v: SkillExecutionMeta | null) => void
  appendStreamingContent: (token: string) => void
  setStreamingMeta: (meta: ChatUIState['streamingMeta']) => void
  resetStreaming: () => void
}

const settings = useSettingsStore.getState()

export const useChatStore = create<ChatUIState>((set) => ({
  currentSessionId: null,
  input: '',
  provider: settings.defaultProvider,
  model: settings.defaultModel,
  error: '',
  isStreaming: false,
  streamingContent: '',
  selectedSkillId: 'cbo-impact-analysis',
  selectedSourceIds: [],
  caseContext: null,
  lastExecutionMeta: null,
  streamingMeta: null,
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
  setInput: (input) => set({ input }),
  setProvider: (provider) => set({ provider, model: DEFAULT_MODELS[provider] }),
  setModel: (model) => set({ model }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedSkillId: (selectedSkillId) => set({ selectedSkillId }),
  setSelectedSourceIds: (selectedSourceIds) => set({ selectedSourceIds }),
  setCaseContext: (caseContext) => set({ caseContext }),
  toggleSourceId: (sourceId) =>
    set((state) => ({
      selectedSourceIds: state.selectedSourceIds.includes(sourceId)
        ? state.selectedSourceIds.filter((item) => item !== sourceId)
        : [...state.selectedSourceIds, sourceId],
    })),
  setLastExecutionMeta: (lastExecutionMeta) => set({ lastExecutionMeta }),
  appendStreamingContent: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),
  setStreamingMeta: (streamingMeta) => set({ streamingMeta }),
  resetStreaming: () =>
    set({ isStreaming: false, streamingContent: '', streamingMeta: null }),
}))
