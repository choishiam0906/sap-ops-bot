import { create } from 'zustand'

// ─── 새 계층형 네비게이션 타입 ───

export type AppSection = 'cockpit' | 'ask-sap' | 'cbo' | 'knowledge' | 'settings'

export type CockpitSubPage = 'overview' | 'pending' | 'high-risk' | 'today' | 'issues'
export type AskSapSubPage = 'all' | 'flagged' | 'cases' | 'archive'
export type CboSubPage = 'new' | 'history' | 'batch' | 'diff'
export type KnowledgeSubPage = 'local-folders' | 'apis' | 'mcps' | 'vault'

/** @deprecated Phase 1 호환 레이어 — 점진적 제거 예정 */
export type AppPage = 'chat' | 'cbo' | 'audit' | 'sources' | 'skills' | 'vault' | 'settings'

interface AppShellState {
  currentSection: AppSection
  subPage: string | null
  sidebarCollapsed: boolean
  setSection: (section: AppSection, subPage?: string | null) => void
  setSubPage: (subPage: string | null) => void
  toggleSidebar: () => void
  /** @deprecated Phase 1 호환 레이어 */
  currentPage: AppPage
  /** @deprecated Phase 1 호환 레이어 */
  setCurrentPage: (page: AppPage) => void
}

// AppPage → AppSection 매핑
function pageToSection(page: AppPage): { section: AppSection; subPage: string | null } {
  switch (page) {
    case 'audit': return { section: 'cockpit', subPage: 'overview' }
    case 'chat': return { section: 'ask-sap', subPage: 'all' }
    case 'skills': return { section: 'ask-sap', subPage: 'all' }
    case 'cbo': return { section: 'cbo', subPage: 'new' }
    case 'sources': return { section: 'knowledge', subPage: 'local-folders' }
    case 'vault': return { section: 'knowledge', subPage: 'vault' }
    case 'settings': return { section: 'settings', subPage: null }
  }
}

// AppSection → AppPage 역매핑 (호환용)
function sectionToPage(section: AppSection): AppPage {
  switch (section) {
    case 'cockpit': return 'audit'
    case 'ask-sap': return 'chat'
    case 'cbo': return 'cbo'
    case 'knowledge': return 'sources'
    case 'settings': return 'settings'
  }
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentSection: 'cockpit',
  subPage: 'overview',
  sidebarCollapsed: false,

  setSection: (currentSection, subPage) =>
    set({ currentSection, subPage: subPage ?? null, currentPage: sectionToPage(currentSection) }),

  setSubPage: (subPage) => set({ subPage }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // 호환 레이어: 기존 setCurrentPage 호출이 새 상태도 동기화
  currentPage: 'audit',
  setCurrentPage: (page) => {
    const { section, subPage } = pageToSection(page)
    set({ currentPage: page, currentSection: section, subPage })
  },
}))
