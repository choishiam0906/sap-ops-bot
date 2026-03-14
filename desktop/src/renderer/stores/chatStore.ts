import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
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

// ─── 셀렉터 훅 (부분 구독으로 불필요 리렌더링 방지) ───

export const useChatInput = () =>
  useChatStore(useShallow((s) => ({ input: s.input, setInput: s.setInput })))

export const useChatSession = () =>
  useChatStore(useShallow((s) => ({
    currentSessionId: s.currentSessionId,
    setCurrentSessionId: s.setCurrentSessionId,
  })))

export const useChatProvider = () =>
  useChatStore(useShallow((s) => ({
    provider: s.provider,
    model: s.model,
    setProvider: s.setProvider,
    setModel: s.setModel,
  })))

export const useChatStreaming = () =>
  useChatStore(useShallow((s) => ({
    isStreaming: s.isStreaming,
    streamingContent: s.streamingContent,
    streamingMeta: s.streamingMeta,
    setIsStreaming: s.setIsStreaming,
    appendStreamingContent: s.appendStreamingContent,
    setStreamingMeta: s.setStreamingMeta,
    resetStreaming: s.resetStreaming,
  })))

export const useChatSkillSources = () =>
  useChatStore(useShallow((s) => ({
    selectedSkillId: s.selectedSkillId,
    selectedSourceIds: s.selectedSourceIds,
    caseContext: s.caseContext,
    lastExecutionMeta: s.lastExecutionMeta,
    setSelectedSkillId: s.setSelectedSkillId,
    setSelectedSourceIds: s.setSelectedSourceIds,
    setCaseContext: s.setCaseContext,
    toggleSourceId: s.toggleSourceId,
    setLastExecutionMeta: s.setLastExecutionMeta,
  })))

export const useChatError = () =>
  useChatStore(useShallow((s) => ({ error: s.error, setError: s.setError, clearError: s.clearError })))
