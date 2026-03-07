import { create } from 'zustand'

export type AppPage = 'chat' | 'cbo' | 'audit' | 'vault' | 'settings'

interface AppShellState {
  currentPage: AppPage
  setCurrentPage: (page: AppPage) => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentPage: 'audit',
  setCurrentPage: (currentPage) => set({ currentPage }),
}))
