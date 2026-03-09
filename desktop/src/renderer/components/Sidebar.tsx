import {
  MessageSquare, Search, LayoutDashboard, Settings,
  PanelLeftClose, PanelLeft, BookOpen, Plus, Sparkles,
} from 'lucide-react'
import type { AppSection } from '../stores/appShellStore'
import { useAppShellStore } from '../stores/appShellStore'
import { NavItemGroup } from './sidebar/NavItemGroup'
import type { NavGroupItem } from './sidebar/NavItemGroup'
import { Button } from './ui/Button'
import { useChatStore } from '../stores/chatStore'
import './Sidebar.css'

const MAIN_NAV_ITEMS: NavGroupItem[] = [
  {
    id: 'cockpit',
    section: 'cockpit',
    label: 'Cockpit',
    Icon: LayoutDashboard,
    position: 'main',
    children: [
      { id: 'cockpit-overview', subPage: 'overview', label: 'Overview' },
      { id: 'cockpit-pending', subPage: 'pending', label: '승인 대기' },
      { id: 'cockpit-high-risk', subPage: 'high-risk', label: '고위험 분석' },
      { id: 'cockpit-today', subPage: 'today', label: '오늘 작업' },
      { id: 'cockpit-issues', subPage: 'issues', label: '최근 이슈' },
    ],
  },
  {
    id: 'ask-sap',
    section: 'ask-sap',
    label: 'Ask SAP',
    Icon: MessageSquare,
    position: 'main',
    children: [
      { id: 'ask-sap-all', subPage: 'all', label: '전체 세션' },
      { id: 'ask-sap-flagged', subPage: 'flagged', label: '중요 세션' },
      { id: 'ask-sap-cases', subPage: 'cases', label: '저장한 케이스' },
      { id: 'ask-sap-archive', subPage: 'archive', label: 'Archive' },
    ],
  },
  {
    id: 'cbo',
    section: 'cbo',
    label: 'CBO 분석',
    Icon: Search,
    position: 'main',
    children: [
      { id: 'cbo-new', subPage: 'new', label: '새 분석' },
      { id: 'cbo-history', subPage: 'history', label: '분석 이력' },
      { id: 'cbo-batch', subPage: 'batch', label: 'Batch / Folder Run' },
      { id: 'cbo-diff', subPage: 'diff', label: 'Diff / 영향도' },
    ],
  },
  {
    id: 'knowledge',
    section: 'knowledge',
    label: 'Knowledge',
    Icon: BookOpen,
    position: 'main',
    children: [
      { id: 'knowledge-local', subPage: 'local-folders', label: 'Local Folders' },
      { id: 'knowledge-apis', subPage: 'apis', label: 'APIs' },
      { id: 'knowledge-mcps', subPage: 'mcps', label: 'MCPs' },
      { id: 'knowledge-vault', subPage: 'vault', label: 'Vault' },
    ],
  },
]

const BOTTOM_NAV_ITEMS: NavGroupItem[] = [
  {
    id: 'settings',
    section: 'settings',
    label: 'Settings',
    Icon: Settings,
    position: 'bottom',
  },
  {
    id: 'whats-new',
    section: 'settings',
    label: "What's New",
    Icon: Sparkles,
    position: 'bottom',
  },
]

export function Sidebar() {
  const currentSection = useAppShellStore((state) => state.currentSection)
  const subPage = useAppShellStore((state) => state.subPage)
  const sidebarCollapsed = useAppShellStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar)
  const setSection = useAppShellStore((state) => state.setSection)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setCaseContext = useChatStore((state) => state.setCaseContext)
  const setInput = useChatStore((state) => state.setInput)

  function handleNavigate(section: AppSection, sub?: string | null) {
    setSection(section, sub)
  }

  function handleNewSession() {
    setCurrentSessionId(null)
    setCaseContext(null)
    setInput('')
    setSection('ask-sap', 'all')
  }

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!sidebarCollapsed && (
          <div className="sidebar-brand">
            <h1 className="sidebar-title">SAP Assistant</h1>
            <span className="sidebar-version">Desktop Platform v3.0</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* + New Session 버튼 */}
      <div className="sidebar-new-session">
        <Button
          variant="primary"
          size="sm"
          className="sidebar-new-btn"
          onClick={handleNewSession}
          aria-label="새 세션"
          title={sidebarCollapsed ? '새 세션' : undefined}
        >
          <Plus size={16} aria-hidden="true" />
          {!sidebarCollapsed && <span>New Session</span>}
        </Button>
      </div>

      <nav className="sidebar-nav" aria-label="메인 내비게이션">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItemGroup
            key={item.id}
            item={item}
            currentSection={currentSection}
            currentSubPage={subPage}
            collapsed={sidebarCollapsed}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <nav className="sidebar-nav sidebar-nav-bottom" aria-label="하단 내비게이션">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItemGroup
            key={item.id}
            item={item}
            currentSection={currentSection}
            currentSubPage={subPage}
            collapsed={sidebarCollapsed}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>
    </aside>
  )
}
