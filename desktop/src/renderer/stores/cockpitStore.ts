import { create } from 'zustand'
import type { SessionFilter } from '../../main/contracts'

interface CockpitState {
  currentFilter: SessionFilter
  setFilter: (filter: SessionFilter) => void
  statusExpanded: boolean
  labelExpanded: boolean
  toggleStatusExpanded: () => void
  toggleLabelExpanded: () => void
  showAuditLog: boolean
  setShowAuditLog: (show: boolean) => void
}

export const useCockpitStore = create<CockpitState>((set) => ({
  currentFilter: { kind: 'allSessions' },
  setFilter: (currentFilter) => set({ currentFilter }),
  statusExpanded: true,
  labelExpanded: true,
  toggleStatusExpanded: () => set((s) => ({ statusExpanded: !s.statusExpanded })),
  toggleLabelExpanded: () => set((s) => ({ labelExpanded: !s.labelExpanded })),
  showAuditLog: false,
  setShowAuditLog: (showAuditLog) => set({ showAuditLog }),
}))
