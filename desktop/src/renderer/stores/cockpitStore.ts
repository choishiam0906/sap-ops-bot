import { create } from 'zustand'

export type PlanFilter = 'all' | 'in-progress' | 'completed' | 'delayed'
export type CockpitViewMode = 'overview' | 'daily' | 'monthly' | 'yearly' | 'all-plans' | 'schedule'

interface CockpitState {
  selectedPlanId: string | null
  filter: PlanFilter
  searchQuery: string
  viewMode: CockpitViewMode
  setSelectedPlanId: (id: string | null) => void
  setFilter: (filter: PlanFilter) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: CockpitViewMode) => void
}

export const useCockpitStore = create<CockpitState>((set) => ({
  selectedPlanId: null,
  filter: 'all',
  searchQuery: '',
  viewMode: 'overview',
  setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),
}))
