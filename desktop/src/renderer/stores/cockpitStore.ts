import { create } from 'zustand'

export type PlanFilter = 'all' | 'in-progress' | 'completed' | 'delayed'

interface CockpitState {
  selectedPlanId: string | null
  filter: PlanFilter
  searchQuery: string
  setSelectedPlanId: (id: string | null) => void
  setFilter: (filter: PlanFilter) => void
  setSearchQuery: (query: string) => void
}

export const useCockpitStore = create<CockpitState>((set) => ({
  selectedPlanId: null,
  filter: 'all',
  searchQuery: '',
  setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
