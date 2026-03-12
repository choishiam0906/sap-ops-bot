import {
  MessageSquare, LayoutDashboard, Settings,
  PanelLeftClose, PanelLeft, BookOpen, Plus,
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
      { id: 'cockpit-daily', subPage: 'daily', label: 'Daily Tasks' },
      { id: 'cockpit-monthly', subPage: 'monthly', label: '월별 마감' },
      { id: 'cockpit-yearly', subPage: 'yearly', label: '연간 마감' },
      { id: 'cockpit-all-plans', subPage: 'all-plans', label: '전체 Plan' },
    ],
  },
  {
    id: 'sap-assistant',
    section: 'sap-assistant',
    label: 'SAP 어시스턴트',
    Icon: MessageSquare,
    position: 'main',
    children: [
      { id: 'sa-chat', subPage: 'chat', label: '💬 대화' },
      { id: 'sa-flagged', subPage: 'chat:flagged', label: '중요 세션' },
      { id: 'sa-saved', subPage: 'chat:saved', label: '보관함' },
    ],
  },
  {
    id: 'knowledge',
    section: 'knowledge',
    label: 'Knowledge',
    Icon: BookOpen,
    position: 'main',
    defaultSubPage: 'code-lab',
    children: [
      { id: 'knowledge-process', subPage: 'process', label: '📐 프로세스' },
      { id: 'knowledge-skills', subPage: 'skills', label: '⚡ 스킬' },
      { id: 'knowledge-agents', subPage: 'agents', label: '🤖 에이전트' },
      { id: 'knowledge-vault', subPage: 'vault', label: '🔐 볼트' },
      { id: 'knowledge-code-lab', subPage: 'code-lab', label: '🧪 코드 랩' },
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
    setSection('sap-assistant', 'chat')
  }

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!sidebarCollapsed && (
          <div className="sidebar-brand">
            <h1 className="sidebar-title">SAP Assistant</h1>
            <span className="sidebar-version">by boxlogodev · v4.0</span>
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
