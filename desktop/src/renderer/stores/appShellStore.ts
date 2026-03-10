import { create } from 'zustand'

// ─── 새 계층형 네비게이션 타입 ───

export type AppSection = 'cockpit' | 'sap-assistant' | 'knowledge' | 'settings'

export type CockpitSubPage = 'overview' | 'daily' | 'monthly' | 'yearly' | 'all-plans'
export type SapAssistantSubPage =
  | 'chat'           // 대화 모드 (기본)
  | 'chat:flagged'   // 중요 세션 필터
  | 'chat:saved'     // 보관함 필터
  | 'analysis'       // 분석 모드
  | 'archive'        // 소스코드 아카이브
export type KnowledgeSubPage = 'sources' | 'skills' | 'vault'

/** @deprecated Phase 1 호환 레이어 — AskSapSubPage는 SessionFilterTab으로 이전됨 */
export type AskSapSubPage = 'all' | 'flagged' | 'saved'
/** @deprecated Phase 1 호환 레이어 — CboSubPage는 제거 예정 */
export type CboSubPage = 'new' | 'history' | 'batch' | 'diff'

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
    case 'chat': return { section: 'sap-assistant', subPage: 'chat' }
    case 'skills': return { section: 'sap-assistant', subPage: 'chat' }
    case 'cbo': return { section: 'sap-assistant', subPage: 'analysis' }
    case 'sources': return { section: 'knowledge', subPage: 'sources' }
    case 'vault': return { section: 'knowledge', subPage: 'vault' }
    case 'settings': return { section: 'settings', subPage: null }
  }
}

// AppSection → AppPage 역매핑 (호환용)
function sectionToPage(section: AppSection): AppPage {
  switch (section) {
    case 'cockpit': return 'audit'
    case 'sap-assistant': return 'chat'
    case 'knowledge': return 'sources'
    case 'settings': return 'settings'
  }
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentSection: 'cockpit',
  subPage: null,
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
