import { create } from 'zustand'
import type { AuditAction } from '../../main/contracts'

type AuditTab = 'sessions' | 'audit'

interface AuditState {
  tab: AuditTab
  setTab: (tab: AuditTab) => void
  filterAction: AuditAction | ''
  filterDateFrom: string
  filterDateTo: string
  setFilterAction: (action: AuditAction | '') => void
  setFilterDateFrom: (date: string) => void
  setFilterDateTo: (date: string) => void
  resetFilters: () => void
}

export const useAuditStore = create<AuditState>((set) => ({
  tab: 'sessions',
  setTab: (tab) => set({ tab }),
  filterAction: '',
  filterDateFrom: '',
  filterDateTo: '',
  setFilterAction: (filterAction) => set({ filterAction }),
  setFilterDateFrom: (filterDateFrom) => set({ filterDateFrom }),
  setFilterDateTo: (filterDateTo) => set({ filterDateTo }),
  resetFilters: () =>
    set({
      filterAction: '',
      filterDateFrom: '',
      filterDateTo: '',
    }),
}))
