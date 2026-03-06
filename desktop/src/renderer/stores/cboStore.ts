import { create } from 'zustand'
import type { CboAnalysisResult, CboRunDiffOutput, ProviderType } from '../../main/contracts.js'

type Tab = 'text' | 'file' | 'history'

interface CboUIState {
  tab: Tab
  busy: boolean
  status: string
  error: string

  // 텍스트 분석
  fileName: string
  sourceText: string
  useLlm: boolean
  provider: ProviderType
  model: string
  result: CboAnalysisResult | null

  // 이력
  selectedRunId: string
  fromRunId: string
  diffResult: CboRunDiffOutput | null

  setTab: (v: Tab) => void
  setBusy: (v: boolean) => void
  setStatus: (v: string) => void
  setError: (v: string) => void
  setFileName: (v: string) => void
  setSourceText: (v: string) => void
  setUseLlm: (v: boolean) => void
  setProvider: (v: ProviderType) => void
  setModel: (v: string) => void
  setResult: (v: CboAnalysisResult | null) => void
  setSelectedRunId: (v: string) => void
  setFromRunId: (v: string) => void
  setDiffResult: (v: CboRunDiffOutput | null) => void
}

export const useCboStore = create<CboUIState>((set) => ({
  tab: 'text',
  busy: false,
  status: '',
  error: '',
  fileName: 'inline-cbo.md',
  sourceText: '',
  useLlm: false,
  provider: 'codex',
  model: 'gpt-4.1-mini',
  result: null,
  selectedRunId: '',
  fromRunId: '',
  diffResult: null,
  setTab: (tab) => set({ tab }),
  setBusy: (busy) => set({ busy }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setFileName: (fileName) => set({ fileName }),
  setSourceText: (sourceText) => set({ sourceText }),
  setUseLlm: (useLlm) => set({ useLlm }),
  setProvider: (provider) => set({ provider }),
  setModel: (model) => set({ model }),
  setResult: (result) => set({ result }),
  setSelectedRunId: (selectedRunId) => set({ selectedRunId }),
  setFromRunId: (fromRunId) => set({ fromRunId }),
  setDiffResult: (diffResult) => set({ diffResult }),
}))
