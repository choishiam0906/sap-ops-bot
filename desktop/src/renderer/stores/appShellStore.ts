import { create } from 'zustand'

// ─── 새 계층형 네비게이션 타입 ───

export type AppSection = 'cockpit' | 'sap-assistant' | 'knowledge' | 'settings'

export type CockpitSubPage = 'overview' | 'daily' | 'monthly' | 'yearly' | 'all-plans'
export type CodeLabSubPage =
  | 'code-lab'
  | 'code-lab:sources'
  | 'code-lab:analysis'
  | 'code-lab:archive'
export type SapAssistantSubPage =
  | 'chat'           // 대화 모드 (기본)
  | 'chat:flagged'   // 중요 세션 필터
  | 'chat:saved'     // 보관함 필터
  | 'analysis'       // 분석 모드 (레거시, code-lab:analysis로 리다이렉트)
  | 'archive'        // 소스코드 아카이브 (레거시, code-lab:archive로 리다이렉트)
  | CodeLabSubPage
export type KnowledgeSubPage = 'process' | 'skills' | 'agents' | 'vault' | CodeLabSubPage

/** @deprecated Phase 1 호환 레이어 — AskSapSubPage는 SessionFilterTab으로 이전됨 */
export type AskSapSubPage = 'all' | 'flagged' | 'saved'
/** @deprecated Phase 1 호환 레이어 — CboSubPage는 제거 예정 */
export type CboSubPage = 'new' | 'history' | 'batch' | 'diff'

/** @deprecated Phase 1 호환 레이어 — 점진적 제거 예정 */
export type AppPage = 'chat' | 'cbo' | 'audit' | 'sources' | 'process' | 'skills' | 'vault' | 'settings'

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
    case 'chat': return { section: 'sap-assistant', subPage: 'chat' }
    case 'process': return { section: 'knowledge', subPage: 'process' }
    case 'skills': return { section: 'knowledge', subPage: 'skills' }
    case 'cbo': return { section: 'knowledge', subPage: 'code-lab:analysis' }
    case 'sources': return { section: 'knowledge', subPage: 'code-lab:sources' }
    case 'vault': return { section: 'knowledge', subPage: 'vault' }
    case 'settings': return { section: 'settings', subPage: null }
  }
}

// AppSection → AppPage 역매핑 (호환용)
function sectionToPage(section: AppSection, subPage: string | null): AppPage {
  switch (section) {
    case 'cockpit': return 'audit'
    case 'sap-assistant': return 'chat'
    case 'knowledge':
      if (subPage === 'process') return 'process'
      if (subPage === 'skills') return 'skills'
      if (subPage === 'vault') return 'vault'
      if (subPage === 'code-lab:analysis') return 'cbo'
      return 'sources'
    case 'settings': return 'settings'
  }
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentSection: 'cockpit',
  subPage: null,
  sidebarCollapsed: false,

  setSection: (currentSection, subPage) =>
    set(() => {
      const nextSubPage = subPage ?? null
      return {
        currentSection,
        subPage: nextSubPage,
        currentPage: sectionToPage(currentSection, nextSubPage),
      }
    }),

  setSubPage: (subPage) => set({ subPage }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // 호환 레이어: 기존 setCurrentPage 호출이 새 상태도 동기화
  currentPage: 'audit',
  setCurrentPage: (page) => {
    const { section, subPage } = pageToSection(page)
    set({ currentPage: page, currentSection: section, subPage })
  },
}))
