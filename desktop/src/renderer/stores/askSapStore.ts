import { create } from 'zustand'
import type { AskSapSubPage } from './appShellStore'

export type SessionFilterTab = AskSapSubPage

interface AskSapState {
  filterTab: SessionFilterTab
  searchQuery: string
  setFilterTab: (tab: SessionFilterTab) => void
  setSearchQuery: (query: string) => void
}

export const useAskSapStore = create<AskSapState>((set) => ({
  filterTab: 'all',
  searchQuery: '',
  setFilterTab: (filterTab) => set({ filterTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
