import { create } from 'zustand'

export type SessionFilterTab = 'all' | 'flagged' | 'saved'

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
